import { useEffect } from 'react'
import axios from 'axios'
import { currencyValueToWei, useAccount, weiToCurrencyValue } from '..'
import { useCurrentMutableState as useRef } from './useCurrentMutableState'
import {
  ChainId,
  Token,
  Fetcher,
  Trade,
  TokenAmount,
  TradeType,
  Route,
  WETH
} from '@uniswap/sdk'
import Web3 from "web3";

type Res = {
  toTokenAmount: string
}

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const UNI_ADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'

const getExpectedUniSwapPrice = async ({
  fromTokenAddress,
  toTokenAddress,
  amount,
  decimalsIn,
  decimalsOut,
}: {
  fromTokenAddress: string
  toTokenAddress: string
  amount: string
  decimalsIn: number
  decimalsOut: number
}): Promise<Res> => {
  let from = fromTokenAddress
  let to = toTokenAddress

  if (fromTokenAddress === '0x0000000000000000000000000000000000000000') {
    from = WETH[1].address
  }

  if (toTokenAddress === '0x0000000000000000000000000000000000000000') {
    to = WETH[1].address
  }
  
  if(!from)  throw new Error("address from not set")
  if(!to)  throw new Error("address to not set")
  const { toBN } = Web3.utils;
  if (
    (from === UNI_ADDRESS ||
    to === UNI_ADDRESS) && toBN(currencyValueToWei(10, decimalsIn)).gt(toBN(amount))
  ) {
    const TOKEN = new Token(ChainId.MAINNET, from, decimalsIn)
    const TOKEN_2 = new Token(ChainId.MAINNET, to, decimalsOut)

    const pair = await Fetcher.fetchPairData(TOKEN, TOKEN_2)
    const route = new Route([pair], TOKEN)

    const trade = new Trade(
      route,
      new TokenAmount(TOKEN, amount),
      TradeType.EXACT_INPUT
    )
 
    return { toTokenAmount: currencyValueToWei(trade.outputAmount.toSignificant(6), decimalsOut) }
  }
  const url = `https://api.1inch.exchange/v3.0/1/quote?fromTokenAddress=${from}&toTokenAddress=${to}&amount=${amount}&protocols=UNISWAP_V3%2CUNISWAP_V2`
  return axios
    .get(url, {
      withCredentials: false,
    })
    .then((response) => {
      const res = response.data as Res
      return res
    })
    .catch((e) => {
      throw new Error(e.message)
    })
}

const UPDATE_BLOCK_NUMBER_THRESHOLD = 8
export const useSwapRates = (): void => {
  const {
    swapRates,
    currency,
    desiredCurrency,
    block,
    ERC20TokensMainContract,
  } = useAccount()

  const previousBlock = useRef(0)
  const __swapRates = useRef(swapRates)

  const getTokensDecimals = ({
    token1,
    token2,
  }: {
    token1: string
    token2: string
  }) => {
    const dec = {
      decimalsIn:
        ERC20TokensMainContract.find(token => token.address === token1)?.decimals || 18,
      decimalsOut:
       ERC20TokensMainContract.find(token => token.address === token2)?.decimals || 18,
    }

    return dec
  }

  const __getTokensDecimals = useRef(getTokensDecimals);
  const getMainnetTokenAddress = (symbol: string) => {
    if (symbol === 'ETH') {
      return WETH[1].address
    }
    const tokenAddress = ERC20TokensMainContract.find(token => token.symbol === symbol)?.address
    if(!tokenAddress) throw new Error("wrong token address")
    return tokenAddress
  }
  useEffect(() => {
    if (block < 1) return
    if (block - previousBlock.current < UPDATE_BLOCK_NUMBER_THRESHOLD) return

    const swapRates = __swapRates.current
    if (swapRates.updateCmd.is.running) return
    swapRates.updateCmd.start()

    swapRates.swapCompareCmd.is.prepared()
    swapRates.swapOutputRateCmd.is.prepared()
    swapRates.currentCurrencyUsdRateCmd.is.prepared()
    swapRates.desiredCurrencyUsdRateCmd.is.prepared()

    swapRates.updateCmd.done()
    previousBlock.current = block
  }, [block])

  useEffect(() => {
    const swapRates = __swapRates.current
    swapRates.currentCurrencyUsdRateCmd.is.prepared()
  }, [currency.address])

  useEffect(() => {
    const swapRates = __swapRates.current
    swapRates.desiredCurrencyUsdRateCmd.is.prepared()
  }, [desiredCurrency.address])

  const __swapCompareCmd = useRef(swapRates.swapCompareCmd)
  useEffect(() => {
    const swapCompareCmd = __swapCompareCmd.current
    const getTokensDecimals = __getTokensDecimals.current
    if (swapCompareCmd.is.running || !swapCompareCmd.is.ready) return

    const getRates = async () => {
      try {
        swapCompareCmd.start()
        const token1 = swapCompareCmd.inputTokenAddress
        const token2 = swapCompareCmd.outputTokenAddress
        const res = await getExpectedUniSwapPrice({
          fromTokenAddress: token1,
          toTokenAddress: token2,
          amount: swapCompareCmd.inputAmount,
          ...getTokensDecimals({ token1, token2})
        })
        const toAmount = res.toTokenAmount
        swapCompareCmd.setOutputAmount(toAmount)
        swapCompareCmd.done()
      } catch (e) {
        const error = e as { message: string }
        swapCompareCmd.failed({ message: error.message })
      }
    }
    getRates()
  }, [swapRates.swapCompareCmd.is.ready])

  const __swapOutputRateCmd = useRef(swapRates.swapOutputRateCmd)
  useEffect(() => {
    const swapOutputRateCmd = __swapOutputRateCmd.current
    const getTokensDecimals = __getTokensDecimals.current
    if (swapOutputRateCmd.is.running || !swapOutputRateCmd.is.ready) return
    const getRates = async () => {
      try {
        swapOutputRateCmd.start()
        const token1 = swapOutputRateCmd.inputTokenAddress
        const token2 = swapOutputRateCmd.outputTokenAddress
        const res = await getExpectedUniSwapPrice({
          fromTokenAddress: token1,
          toTokenAddress: token2,
          amount: swapOutputRateCmd.inputAmount,
          ...getTokensDecimals({ token1, token2})
        })
        const toAmount = res.toTokenAmount
        swapOutputRateCmd.setOutputRate(toAmount)
        swapOutputRateCmd.done()
      } catch (e) {
        const error = e as { message: string }
        swapOutputRateCmd.failed({ message: error.message })
      }
    }
    getRates()
  }, [swapRates.swapOutputRateCmd.is.ready])

  const __currentCurrencyUsdRateCmd = useRef(
    swapRates.currentCurrencyUsdRateCmd
  )
  const __currency = useRef(currency)
  const __getMainnetTokenAddress = useRef(getMainnetTokenAddress);
  useEffect(() => {
    const currentCurrencyUsdRateCmd = __currentCurrencyUsdRateCmd.current
    const currency = __currency.current
    const swapRates = __swapRates.current
    const getMainnetTokenAddress = __getMainnetTokenAddress.current;
    const getTokensDecimals = __getTokensDecimals.current
    
    if (!currentCurrencyUsdRateCmd.is.ready) return
    const getRates = async () => {
      try {
        currentCurrencyUsdRateCmd.start()
        if (currency.symbol === 'USDT') {
          swapRates.setCurrentCurrencyUsdRate({
            rate: '1',
            symbol: currency.symbol,
          })
          currentCurrencyUsdRateCmd.done()
          return
        }
       
        const token1 = getMainnetTokenAddress(currency.symbol)
        const token2 = USDT_ADDRESS
        const res = await getExpectedUniSwapPrice({
          fromTokenAddress: token1,
          toTokenAddress: token2,
          amount: currencyValueToWei(1, currency.decimals),
          ...getTokensDecimals({ token1, token2 })
        })
        const toAmount = res.toTokenAmount
        swapRates.setCurrentCurrencyUsdRate({
          rate: weiToCurrencyValue(toAmount, 6),
          symbol: currency.symbol,
        })
        currentCurrencyUsdRateCmd.done()
      } catch (e) {
        const error = e as { message: string }
        currentCurrencyUsdRateCmd.failed({ message: error.message })
      }
    }
    getRates()
  }, [swapRates.currentCurrencyUsdRateCmd.is.ready])

  const __desiredCurrencyUsdRateCmd = useRef(
    swapRates.desiredCurrencyUsdRateCmd
  )
  const __desiredCurrency = useRef(desiredCurrency)

  useEffect(() => {
    const desiredCurrencyUsdRateCmd = __desiredCurrencyUsdRateCmd.current
    const desiredCurrency = __desiredCurrency.current
    const swapRates = __swapRates.current
    const getTokensDecimals = __getTokensDecimals.current
    const getMainnetTokenAddress = __getMainnetTokenAddress.current;

    if (!desiredCurrencyUsdRateCmd.is.ready) return
    const getRates = async () => {
      try {
        desiredCurrencyUsdRateCmd.start()
        if (desiredCurrency.symbol === 'USDT') {
          swapRates.setDesiredCurrencyUsdRate({
            rate: '1',
            symbol: desiredCurrency.symbol,
          })
          desiredCurrencyUsdRateCmd.done()
          return
        }
        const token1 = getMainnetTokenAddress(desiredCurrency.symbol)
        const token2 = USDT_ADDRESS
        const res = await getExpectedUniSwapPrice({
          fromTokenAddress: token1,
          toTokenAddress: token2,
          amount: currencyValueToWei(1, desiredCurrency.decimals),
          ...getTokensDecimals({ token1, token2 })
        })
        const toAmount = res.toTokenAmount
        swapRates.setDesiredCurrencyUsdRate({
          rate: weiToCurrencyValue(toAmount, 6),
          symbol: desiredCurrency.symbol,
        })
        desiredCurrencyUsdRateCmd.done()
      } catch (e) {
        const error = e as { message: string }
        desiredCurrencyUsdRateCmd.failed({ message: error.message })
      }
    }
    getRates()
  }, [swapRates.desiredCurrencyUsdRateCmd.is.ready])
}

// uniswap v3 solution
// import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
// interface Immutables {
//   fee: number
//   factory?: Address
//   token0?: Address
//   token1?: Address
//   tickSpacing?: number
//   maxLiquidityPerTick?: number
// }

// interface State {
//   liquidity: ethers.BigNumber
//   sqrtPriceX96: ethers.BigNumber
//   tick: number
//   observationIndex: number
//   observationCardinality: number
//   observationCardinalityNext: number
//   feeProtocol: number
//   unlocked: boolean
// }
// const token0 = new Token(
//   ChainId.MAINNET,
//   WETH[1].address,
//   18
// )
// const token1 = new Token(ChainId.MAINNET, "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6)

// const poolAddress = Pool.getAddress(token0, token1, FeeAmount.LOW)
// console.log(poolAddress, 'poolAddress')
// const poolContract = new ethers.Contract(
//   poolAddress,
//   IUniswapV3PoolABI,
//   provider
// )

// async function getPoolImmutables() {
//   const PoolImmutables: Immutables = {
//     factory: await poolContract.factory(),
//     token0: await poolContract.token0(),
//     token1: await poolContract.token1(),
//     fee: await poolContract.fee(),
//     tickSpacing: await poolContract.tickSpacing(),
//     maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
//   }
//   return PoolImmutables
// }

// console.log(poolContract, 'poolContract')
// async function getPoolState() {
//   const slot = await poolContract.slot0()
//   console.log(slot, 'slot')
//   const PoolState: State = {
//     liquidity: await poolContract.liquidity(),
//     sqrtPriceX96: slot[0],
//     tick: slot[1],
//     observationIndex: slot[2],
//     observationCardinality: slot[3],
//     observationCardinalityNext: slot[4],
//     feeProtocol: slot[5],
//     unlocked: slot[6],
//   }
//   return PoolState
// }
// const immutables = await getPoolImmutables()
// const state = await getPoolState()
// console.log(immutables, state, 'new pool immutables state')
// const contractTick = await poolContract.ticks(0)
// console.log(contractTick, " contract ticks")

// const tick = new Tick({ index: 0, liquidityGross: contractTick.liquidityGross, liquidityNet: contractTick.liquidityNet })
// const ticksProvider = new TickListDataProvider([tick], immutables.tickSpacing || 1)
// const pool = new Pool(
//   token0,
//   token1,
//   immutables.fee,
//   state.sqrtPriceX96.toString(),
//   state.liquidity.toString(),
//   state.tick,
//   ticksProvider
// )

// console.log(pool, 'new pool')
// const currencyAmount = CurrencyAmount.fromRawAmount(
//   token0,
//   etherToWei('100')
// )
// console.log(pool.token0Price.toSignificant(6))
// console.log(pool.priceOf(token0).toSignificant(6))
// console.log(pool.token1Price.toSignificant(6))

// const oa = await pool.getOutputAmount(currencyAmount);
// console.log(oa[0].toSignificant(6), "out 1")
// console.log(oa[1], "out 2")
// console.log(oa, "out 2")
// console.log(oa[1].token0Price.toSignificant(6) )
// console.log(oa[1].priceOf(token0).toSignificant(6) )
// console.log(oa[1].token1Price.toSignificant(6))

// const route = new Route([pool], pool.token0, pool.token1)

// const currencyAmount2 = CurrencyAmount.fromRawAmount(
//   token1,
//   etherToWei('0.02')

// )

// const trade = await Trade.exactIn(route, currencyAmount)
// console.log(trade.priceImpact.toSignificant(6), 'priceImpact')
// console.log(trade.executionPrice.toSignificant(6), 'executionPrice')
// console.log(trade.swaps[0].outputAmount.toSignificant(6), 'outputAmount')
