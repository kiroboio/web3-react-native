export type EthTransferState =
  | 'waiting-for-deposit'
  | 'retrieving'
  | 'retrieved'
  | 'ready'
  | 'collecting'
  | 'collected'
  | 'swapping'
  | 'swapped'
  | 'rejected'
  | 'invalid'
  | 'new'
  | 'creating'
  | 'unknown'

export interface EthCollectInfo {
  /**
   * blockchain height
   *
   * @TJS-type number
   */
  broadcasted: number
  /**
   * block number of confirmed transaction
   *
   * @TJS-type number
   */
  confirmed: number
  /**
   * the tx id of the transaction
   *
   * @TJS-type string
   */
  txid: string
}

export interface EthRetrieveInfo {
  /**
   * blockchain height
   *
   * @TJS-type number
   */
  broadcasted: number
  /**
   * block number of confirmed transaction
   *
   * @TJS-type number
   */
  confirmed: number
  /**
   * the tx id of the transaction
   *
   * @TJS-type string
   */
  txid: string
}

export interface EthDepositInfo {
  /**
   * blockchain height
   *
   * @TJS-type number
   */
  broadcasted: number
  /**
   * block number of confirmed transaction
   *
   * @TJS-type number
   */
  confirmed: number
  /**
   * the tx id of the transaction
   *
   * @TJS-type string
   */
  txid: string
}

export interface EthTransactionInfo {
  inputs: { txid: string; vout: number }[]
  coins: { value: number; address: string }[]
  txid: string
  hex: string
}

export interface EthTokenInfo {
  address: string
  decimals: number
  symbol: string
  type: 'ERC20'
}

export interface EthSwapInfo {
  value: string
  token?: EthTokenInfo
  fees: string
}

export interface PaymentRequest {
  from: string
  value: string
  v: string
  r: string
  s: string
}

export interface TransferFees {
  kiro?: {
    from: string
    value: string
    v: string
    r: string
    s: string
  }
  eth?: {
    to: string
    value: number
  }
}

// tslint:disable-next-line: no-empty-interface
export type EthTransactionInformation = EthTransactionInfo

export interface EthTransferCreateRequestDto {
  /**
   * senders address
   *
   * @TJS-type string
   */
  from: string

  /**
   * the destination address
   *
   * @TJS-type string
   */
  to: string

  /**
   * the transfer amount in wei
   *
   * @TJS-type string
   */
  value: string

  token?: EthTokenInfo

  swap?: EthSwapInfo

  /**
   * the transfer fees in wei
   *
   * @TJS-type string
   */
  fees: string

  /**
   * hash use to verify recipient pass code
   *
   * @TJS-type string
   */
  secretHash: string

  /**
   * free text to be attached to this transfer
   *
   * @TJS-type string
   */
  message: string

  salt: string
  state: EthTransferState
  txid: string

  /**
   * update date-time
   *
   * @TJS-type Date
   */
  updatedAt: Date
  deposit: EthDepositInfo
}

export interface EthTransferCreateDto extends EthTransferCreateRequestDto {
  /**
   * secret salt use to encrypt collect transaction
   *
   * @TJS-type string
   */
  // salt2: string

  /**
   * create date-time
   *
   */
  createdAt: Date

  expires: {
    at?: Date
    block?: number
  }

  // apiKey?: string,
  // origin?: string,
  // userAgent?: string,
}

export interface EthTransferUpdateRequestDto extends EthTransferCreateDto {
  /**
   * transfer state
   *
   * @TJS-type EthTransferState
   */
  state: EthTransferState
  collect: EthCollectInfo
  retrieve: EthRetrieveInfo
  _id: string
}

export interface EthTransferUpdateDto extends EthTransferUpdateRequestDto {
  state: EthTransferState
  updatedAt: Date
}

export interface EthTransferPatchDto {
  state: EthTransferState
  deposit?: EthDepositInfo
  collect?: EthCollectInfo
  retrieve?: EthRetrieveInfo
  expires?: {
    at?: Date
    block?: number
  }
  updatedAt: Date
}

export interface EthTransferData extends EthTransferCreateDto {
  _id: string
  deposit: EthDepositInfo
  collect: EthCollectInfo
  retrieve: EthRetrieveInfo
  /**
   * salt use to encrypt collect transaction
   *
   * @TJS-type string
   */
}

export interface EthTransferSearchRequestDto {
  /**
   * transfer unique id
   *
   * @TJS-type string
   */
  id: string
}

export interface EthTransferResponseDto {
  /**
   * senders address
   *
   * @TJS-type string
   */
  from: string

  /**
   * the destination address
   *
   * @TJS-type string
   */
  to: string

  /**
   * the transfer amount in wei
   *
   * @TJS-type string
   */
  value: string

  /**
   * the coin used (wei if not exist)
   *
   */
  token?: EthTokenInfo

  interchange?: EthSwapInfo

  /**
   * the transfer fees in wei
   *
   * @TJS-type string
   */
  fees: string

  /**
   * salt use to encrypt collect transaction
   *
   * @TJS-type string
   */
  salt: string

  /**
   * hash use to verify recipient pass code
   *
   * @TJS-type string
   */
  secretHash: string

  /**
   * free text to be attached to this transfer
   *
   * @TJS-type string
   */
  message: string

  /**
   * hints for the id generator in the format 'algorithm;data'
   *
   * @TJS-type string
   */
  id: string

  /**
   * create date-time
   *
   */
  createdAt: Date

  /**
   * update date-time
   *
   * @TJS-type Date
   */
  updatedAt: Date

  state: EthTransferState
  deposit: EthDepositInfo
  collect: EthCollectInfo
  retrieve: EthRetrieveInfo
  swap: EthCollectInfo

  expires: {
    at?: Date
    block?: number
  }
  txid: string
}

export interface EtherscanTransactionsResponseDto {
  from: string
  to: string
  value: string
  gas: string
  gasPrice: string
  hash: string
  timeStamp: string
  blockNumber: string
  isError: string // '0' no error
  cumulativeGasUsed: string
  gasUsed: string
  input: string
  token?: EthTokenInfo
  tokenDecimal?: "18"
  tokenName?: "Kirobo"
  tokenSymbol?: "KIRO"
}
