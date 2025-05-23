import KashiCooker, { signMasterContractApproval } from '../entities/KashiCooker'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { KASHI_ADDRESS } from '@zoolabs/zdk'
import { setKashiApprovalPending } from '../state/application/actions'
import { useActiveWeb3React } from '../hooks/useActiveWeb3React'
import { useBentoBoxContract } from './useContract'
import { useBentoMasterContractAllowed } from '../state/bentobox/hooks'
import { useDispatch } from 'react-redux'
import { useKashiApprovalPending } from '../state/application/hooks'
import { useTransactionAdder } from '../state/transactions/hooks'
import { AddressZero, HashZero } from '@ethersproject/constants'
import { splitSignature } from '@ethersproject/bytes'

export enum BentoApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  FAILED,
  APPROVED,
}

export interface KashiPermit {
  account: string
  masterContract: string
  v: number
  r: string
  s: string
}

export enum BentoApproveOutcome {
  SUCCESS,
  REJECTED,
  FAILED,
  NOT_READY,
}

export type BentoApproveResult = {
  outcome: BentoApproveOutcome
  permit?: KashiPermit
}

// returns a variable indicating the state of the approval and a function which approves if necessary or early returns
function useKashiApproveCallback(): [
  BentoApprovalState,
  boolean,
  KashiPermit | undefined,
  () => void,
  (pair: any, execute: (cooker: KashiCooker) => Promise<string>) => void
] {
  const { account, library, chainId } = useActiveWeb3React()
  const dispatch = useDispatch()
  const [approveKashiFallback, setApproveKashiFallback] = useState<boolean>(false)
  const [kashiPermit, setKashiPermit] = useState<KashiPermit | undefined>(undefined)

  useEffect(() => {
    setKashiPermit(undefined)
  }, [account, chainId])

  const masterContract = chainId && KASHI_ADDRESS[chainId]?.toString();

  const pendingApproval = useKashiApprovalPending()
  const currentAllowed = useBentoMasterContractAllowed(masterContract.toString(), account)
  const addTransaction = useTransactionAdder()

  // check the current approval status
  const approvalState: BentoApprovalState = useMemo(() => {
    if (!masterContract) return BentoApprovalState.UNKNOWN
    if (!currentAllowed && pendingApproval) return BentoApprovalState.PENDING

    return currentAllowed ? BentoApprovalState.APPROVED : BentoApprovalState.NOT_APPROVED
  }, [masterContract, currentAllowed, pendingApproval])

  const bentoBoxContract = useBentoBoxContract()

  const approve = useCallback(async (): Promise<BentoApproveResult> => {
    if (approvalState !== BentoApprovalState.NOT_APPROVED) {
      console.error('approve was called unnecessarily')
      return { outcome: BentoApproveOutcome.NOT_READY }
    }
    if (!masterContract) {
      console.error('no token')
      return { outcome: BentoApproveOutcome.NOT_READY }
    }

    if (!bentoBoxContract) {
      console.error('no bentobox contract')
      return { outcome: BentoApproveOutcome.NOT_READY }
    }

    if (!account) {
      console.error('no account')
      return { outcome: BentoApproveOutcome.NOT_READY }
    }
    if (!library) {
      console.error('no library')
      return { outcome: BentoApproveOutcome.NOT_READY }
    }

    try {
      const signature = await signMasterContractApproval(
        bentoBoxContract,
        masterContract,
        account,
        library,
        true,
        chainId
      )
      const { v, r, s } = splitSignature(signature)
      return {
        outcome: BentoApproveOutcome.SUCCESS,
        permit: { account, masterContract, v, r, s },
      }
    } catch (e: any) {
      return {
        outcome: e.code === 4001 ? BentoApproveOutcome.REJECTED : BentoApproveOutcome.FAILED,
      }
    }
  }, [approvalState, account, library, chainId, bentoBoxContract, masterContract])

  const onApprove = async function () {
    if (!approveKashiFallback) {
      const result = await approve()
      if (result.outcome === BentoApproveOutcome.SUCCESS) {
        setKashiPermit(result.permit)
      } else if (result.outcome === BentoApproveOutcome.FAILED) {
        setApproveKashiFallback(true)
      }
    } else {
      const tx = await bentoBoxContract?.setMasterContractApproval(account, masterContract, true, 0, HashZero, HashZero)
      dispatch(setKashiApprovalPending('Approve Kashi'))
      await tx.wait()
      dispatch(setKashiApprovalPending(''))
    }
  }

  const onCook = async function (pair: any, execute: (cooker: KashiCooker) => Promise<string>) {
    const cooker = new KashiCooker(pair, account, library, chainId)
    let summary
    if (approvalState === BentoApprovalState.NOT_APPROVED && kashiPermit) {
      cooker.approve(kashiPermit)
      summary = 'Approve Kashi and ' + (await execute(cooker))
    } else {
      summary = await execute(cooker)
    }
    const result = await cooker.cook()
    if (result.success) {
      addTransaction(result.tx, { summary })
      setKashiPermit(undefined)
      await result.tx.wait()
    }
  }

  return [approvalState, approveKashiFallback, kashiPermit, onApprove, onCook]
}

export default useKashiApproveCallback
