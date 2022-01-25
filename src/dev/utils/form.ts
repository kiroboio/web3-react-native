import Web3 from "web3";

import { Maybe } from "yup/lib/types";
import { AnyObject } from "yup/lib/object";
import { useAccount } from "../context/account";
import { currencyValueToWei } from "./ethereum";
import * as yup from "yup";
import { StringSchema, NumberSchema, BaseSchema } from "yup";
const { string, number } = yup;



yup.addMethod<StringSchema>(string, 'emptyAsUndefined', function () {
  return this.transform((value) => (value ? value : undefined))
})

yup.addMethod<NumberSchema>(number, 'emptyAsUndefined', function () {
  return this.transform((value, originalValue) =>
    String(originalValue)?.trim() ? value : undefined
  )
})

yup.addMethod<StringSchema>(string, 'ethereumAddress', function (errorMessage) {
  return this.test(`test-ethereum-address`, errorMessage, function (value) {
    const { path, createError } = this

    const illegalAddresses = [
      '0x0000000000000000000000000000000000000000',
      '0xb1191f691a355b43542bea9b8847bc73e7abb137'
    ]

    return (
      (value && value?.slice(0,2) === '0x' && Web3.utils.isAddress(value) && !illegalAddresses.includes(value)) ||
      createError({ path, message: errorMessage })
    )
  })
})

yup.addMethod<StringSchema>(
  string,
  'ether',
  function (min, minErrorMessage, maxErrorMessage) {
    const { currency, balance, tokenBalance, transferFees } = useAccount()
    return this.test(`test-ether`, 'ether failed', function (value) {
      const { path, createError } = this
      value = value || '0'
      const decimal = value.indexOf('.')
      if (decimal > 0) value = value.substr(0, decimal + 19)
      const { toBN } = Web3.utils
      let weiValue = toBN(currencyValueToWei(value, currency.decimals || 18))
      const weiMin = toBN(min)
      if (value && weiValue.lt(weiMin)) {
        return createError({ path, message: minErrorMessage })
      }
      if(currency.symbol === 'ETH') {
        const fees = toBN(transferFees(value).toString())
        weiValue = weiValue.add(fees) 
      }
      const weiMax = toBN( currency.symbol === 'ETH'  ? balance : tokenBalance)
      if (value && weiValue.gt(weiMax)) {
        return createError({
          path,
          message: `${maxErrorMessage} ${currency.symbol}`,
        })
      }
      return true
    })
  }
)

yup.addMethod<StringSchema>(
  string,
  'desiredCurrency',
  function (min, minErrorMessage) {
    return this.test(`test-ether`, 'ether failed', function (value) {
      const { path, createError } = this
      value = value || '0'
      const decimal = value.indexOf('.')
      if (decimal > 0) value = value.substr(0, decimal + 19)
      const { toBN } = Web3.utils
      const weiValue = toBN(currencyValueToWei(value))
      const weiMin = toBN(min)
      if (value && weiValue.lt(weiMin)) {
        return createError({ path, message: minErrorMessage })
      }
      return true
    })
  }
)


declare module 'yup' {
  interface StringSchema<
    TType extends Maybe<string> = string | undefined,
    TContext extends AnyObject = AnyObject,
    TOut extends TType = TType
  > extends BaseSchema<TType, TContext, TOut> {
    emptyAsUndefined(): StringSchema<TType, TContext>
    ethereumAddress(message: string): StringSchema<TType, TContext>
    ether(
      min: string,
      minMessage: string,
      maxMessage: string
    ): StringSchema<TType, TContext>
    desiredCurrency(
      min: string,
      minMessage: string
    ): StringSchema<TType, TContext>
  }

  interface NumberSchema<
    TType extends Maybe<number> = number | undefined,
    TContext extends AnyObject = AnyObject,
    TOut extends TType = TType
  > extends BaseSchema<TType, TContext, TOut> {
    emptyAsUndefined(): NumberSchema<TType, TContext>
  }
}


export { yup };
