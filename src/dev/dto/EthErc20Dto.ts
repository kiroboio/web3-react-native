export interface EthErc20ResponseDto {
  address: string
  name: string
  symbol: string
  decimals: number
  support: {
    transfer?: boolean
    backup?: boolean
    inheritance?: boolean
  }
}
