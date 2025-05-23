import ARBITRUM from './mappings/arbitrum'
import AVALANCHE from './mappings/avalanche'
import BSC from './mappings/bsc'
import { ChainId } from '@zoolabs/zdk'
import HECO from './mappings/heco'
import KOVAN from './mappings/kovan'
import MAINNET from './mappings/mainnet'
import MATIC from './mappings/matic'
import XDAI from './mappings/xdai'
export type ChainlinkPriceFeedMap = {
  readonly [address: string]: {
    from: string
    to: string
    decimals: number
    fromDecimals: number
    toDecimals: number
    warning?: string
    address?: string
  }
}

export const CHAINLINK_PRICE_FEED_MAP: {
  [chainId in ChainId]?: ChainlinkPriceFeedMap
} = {
  [ChainId.MAINNET]: MAINNET,
  [ChainId.KOVAN]: KOVAN,
  [ChainId.BSC]: BSC,
  [ChainId.HECO]: HECO,
  [ChainId.MATIC]: MATIC,
  [ChainId.XDAI]: XDAI,
  [ChainId.ARBITRUM]: ARBITRUM,
  [ChainId.AVALANCHE]: AVALANCHE,
}
