import { Currency, CurrencyAmount, JSBI } from '@zoolabs/zdk'

import { parseUnits } from '@ethersproject/units'

export function parseBalance(value: string, decimals = 18) {
  return parseUnits(value || '0', decimals)
}

// try to parse a user entered amount for a given token
export function tryParseAmount<T extends Currency>(value?: string, currency?: T): CurrencyAmount<T> | undefined {
  if (!value || !currency) {
    return undefined
  }
  try {
    const typedValueParsed = parseUnits(value, currency.decimals).toString()
    if (typedValueParsed !== '0') {
      return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed))
    }
  } catch (error) {
    // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
  }
  // necessary for all paths to return a value
  return undefined
}
