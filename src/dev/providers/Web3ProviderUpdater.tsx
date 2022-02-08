/* eslint-disable @typescript-eslint/no-shadow */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Web3 from 'web3';
import { toChecksumAddress } from 'web3-utils';
import { toBN } from 'web3-utils';
import { useAccount } from '../context/account';
import { useWeb3 } from '../hooks/useWeb3';
import KiroboService from '@kiroboio/safe-transfer-lib';
import { observer } from 'mobx-react-lite';
import {
  ERC20TokenItem,
  ITransferItem,
  ITransfers,
  tokens,
} from '../stores/account';
import safeTransferABI from '../abi/safeTransfer.json';
import erc20ABI from '../abi/erc20.json';
import safeSwapABI from '../abi/safeSwap.json';
import {
  EtherscanTransactionsResponseDto,
  EthTokenInfo,
  EthTransferResponseDto,
} from '../dto/EthTransfersDto';
import { EthErc20ResponseDto } from '../dto/EthErc20Dto';
import { useSwapRates } from '../hooks/useSwapRates';
import { wait } from '../utils/wait';
import { ProviderProps } from './KiroboProvider';
import axios, { AxiosResponse } from 'axios';

const MAX_CONFIRMS = 30;
const SERVICE = {
  RATES: 'v1/eth/to/usd',
  TOKEN_RATES: 'v1/eth/erc20/rates',
  NETWORKS: 'v1/eth/networks',
  REWARDS(network: string) {
    return `v1/eth/${network}/rewards`;
  },
  BALANCE(network: string) {
    return `v1/eth/${network}/balance`;
  },
  TRANSFERS(network: string) {
    return `v1/eth/${network}/transfers`;
  },
  TRANSFER_REQUEST(network: string) {
    return `v1/eth/${network}/transfer/request`;
  },
  FOLLOW(network: string) {
    return `v1/eth/${network}/action/follow`;
  },
  COLLECT(network: string) {
    return `v1/eth/${network}/action/collect`;
  },
  SWAP(network: string) {
    return `v1/eth/${network}/action/swap`;
  },
  ERC20(network: string) {
    return `v1/eth/${network}/erc20`;
  },
  SECRET(network: string) {
    return `v1/eth/${network}/secret`;
  },
};

const ETHERSCAN_URL = (network: string) => {
  return network === 'main'
    ? 'https://api.etherscan.io/api?'
    : `https://api-${network}.etherscan.io/api?`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const getChainName = (chainId: number | undefined) => {
  if (chainId === 1) return 'main';
  if (chainId === 4) return 'rinkeby';
  return '';
};

interface PutInStoreParams {
  store: ITransfers;
  address: string;
  item: EthTransferResponseDto;
}

interface PutTransactionInStoreParams {
  store: ITransfers;
  address: string;
  item: EtherscanTransactionsResponseDto;
}

interface MoveToStoreParams {
  store: ITransfers;
  address: string;
  item: ITransferItem;
}

interface AddToStoreParams {
  store: ITransfers;
  address: string;
  items: EthTransferResponseDto[];
  count: number;
}

interface AddTransactionsToStoreParams {
  store: ITransfers;
  address: string;
  items: EtherscanTransactionsResponseDto[];
  count: number;
}

const responseToTransferItem = (
  item: EthTransferResponseDto,
): ITransferItem => {
  const confirmedBlock =
    item.state === 'new'
      ? item.deposit.confirmed
      : item.state === 'collected'
        ? item.collect.confirmed
        : item.state === 'retrieved'
          ? item.retrieve.confirmed
          : item.state === 'swapped'
            ? item.swap.confirmed
            : -1;

  const txid =
    item.swap?.txid ||
    item.collect.txid ||
    item.retrieve.txid ||
    item.deposit.txid ||
    item.swap.txid;

  return {
    id: item.id,
    txid,
    from: item.from,
    to: item.to,
    value: item.value,
    fees: item.fees,
    salt: item.salt,
    secretHash: item.secretHash,
    state: item.state,
    updatedAt: new Date(item.updatedAt),
    confirmedBlock,
    message: item.message,
    token: item.token,
    swap: item.interchange,
  };
};

const responseToTransactionItem = (
  item: EtherscanTransactionsResponseDto,
): ITransferItem => {
  return {
    id: item.hash,
    txid: item.hash,
    from: item.from ? toChecksumAddress(item.from) : '',
    to: item.to ? toChecksumAddress(item.to) : '',
    value: item.value,
    fees: toBN(item.gasPrice).mul(toBN(item.gasUsed)).toString(),
    salt: '',
    secretHash: '',
    state: 'unknown',
    updatedAt: new Date(1000 * +item.timeStamp),
    confirmedBlock: +item.blockNumber,
    message: '',
    token: item.token,
  };
};

const moveToStore = ({ store, address, item }: MoveToStoreParams) => {
  store.upsert(address, item);
};

const putInStore = ({ store, address, item }: PutInStoreParams) => {
  store.upsert(address, responseToTransferItem(item));
};

const addToStore = ({ store, address, items, count }: AddToStoreParams) => {
  store.add({
    address,
    count,
    transfers: items.map(item => responseToTransferItem(item)),
  });
};

const putTransactionInStore = ({
  store,
  address,
  item,
}: PutTransactionInStoreParams) => {
  store.upsert(address, responseToTransactionItem(item));
};

const addTransactionsToStore = ({
  store,
  address,
  items,
  count,
}: AddTransactionsToStoreParams) => {
  store.add({
    address,
    count,
    transfers: items.map(item => responseToTransactionItem(item)),
  });
};

interface FetchQueryParams {
  address: string;
  thresholdBlock: number;
  $skip: number;
  $limit: number;
  watch: string;
}

const inboxQuery = ({
  address,
  thresholdBlock,
  $skip,
  $limit,
  watch,
}: FetchQueryParams) => ({
  address,
  type: 'incoming',
  service: 'transfer',
  state: {
    $in: [
      'new',
      'creating',
      'retrieved',
      'retrieving',
      'collected',
      'collecting',
    ],
  },
  $or: [
    { 'collect.confirmed': -1, 'retrieve.confirmed': -1 },
    { 'collect.confirmed': { $gt: thresholdBlock } },
    { 'retrieve.confirmed': { $gt: thresholdBlock } },
  ],
  $sort: { updatedAt: -1 },
  $skip,
  $limit,
  watch,
});

const outboxQuery = ({
  address,
  thresholdBlock,
  $skip,
  $limit,
  watch,
}: FetchQueryParams) => ({
  address,
  type: 'outgoing',
  state: {
    $in: [
      'new',
      'creating',
      'retrieved',
      'retrieving',
      'collected',
      'collecting',
      'unknown',
    ],
  },
  $or: [
    { 'collect.confirmed': -1, 'retrieve.confirmed': -1 },
    { 'collect.confirmed': { $gt: thresholdBlock } },
    { 'retrieve.confirmed': { $gt: thresholdBlock } },
  ],
  $sort: { updatedAt: -1 },
  $skip,
  $limit,
  watch,
});

const transfersQuery = ({
  address,
  thresholdBlock,
  $skip,
  $limit,
  watch,
}: FetchQueryParams) => ({
  address,
  service: 'transfer',
  state: {
    $in: [
      'new',
      'creating',
      'retrieved',
      'retrieving',
      'collected',
      'collecting',
      'unknown',
    ],
  },
  $or: [
    { 'collect.confirmed': -1, 'retrieve.confirmed': -1 },
    { 'collect.confirmed': { $gt: thresholdBlock } },
    { 'retrieve.confirmed': { $gt: thresholdBlock } },
  ],
  $sort: { updatedAt: -1 },
  $skip,
  $limit,
  watch,
});

const swapsQuery = ({
  address,
  thresholdBlock,
  $skip,
  $limit,
  watch,
}: FetchQueryParams) => ({
  address,
  service: 'swap',
  state: {
    $in: [
      'new',
      'creating',
      'retrieved',
      'retrieving',
      'swapped',
      'swapping',
      'unknown',
    ],
  },
  $or: [
    { 'swap.confirmed': -1, 'retrieve.confirmed': -1 },
    { 'swap.confirmed': { $gt: thresholdBlock } },
    { 'retrieve.confirmed': { $gt: thresholdBlock } },
  ],
  $sort: { updatedAt: -1 },
  $skip,
  $limit,
  watch,
});

const historyQuery = ({
  address,
  thresholdBlock,
  $skip,
  $limit,
  watch,
}: FetchQueryParams) => ({
  address,
  $or: [
    { 'collect.confirmed': { $gt: -1, $lte: thresholdBlock } },
    { 'retrieve.confirmed': { $gt: -1, $lte: thresholdBlock } },
    { 'swap.confirmed': { $gt: -1, $lte: thresholdBlock } },
  ],
  $sort: { updatedAt: -1 },
  $skip,
  $limit,
  watch,
});

interface DeleteFromStoreParams {
  store: ITransfers;
  address: string;
  id: string;
}

interface RemoveFromStoreParams {
  store: ITransfers;
  address: string;
  filter: (item: ITransferItem) => boolean;
}

const deleteFromStore = ({ store, address, id }: DeleteFromStoreParams) => {
  store.delete(address, id);
};

const removeFromStore = ({ store, address, filter }: RemoveFromStoreParams) => {
  return store.remove(address, filter);
};

const AMOUNT_OF_TRANSACTIONS_UPPER_THRESHOLD = 99999999;
export const Web3ProviderUpdater = observer(({ children, apiKey, apiSecret, infuraKey }: ProviderProps & { children?: JSX.Element | JSX.Element[] | null }) => {
  const {
    connect: web3Connect,
    disconnect: web3Disconnect,
    library: web3,
    active: web3Active,
    chainId: web3ChainId,
    address: web3Address,
  } = useWeb3({ infuraKey });

  const {
    active,
    setActive,
    connectCmd,
    disconnectCmd,
    address,
    swapperAddress,
    setSwapperBalance,
    setAddress,
    setCanGetRewards,
    chainId,
    setChainId,
    block,
    setBlock,
    setBalance,
    setGasPrice,
    setMaxRewards,
    setRewardsParams,
    setTokenBalance,
    setStakingBalance,
    setRate,
    approvedCmd,
    sendCmd,
    depositCmd,
    swapDepositCmd,
    retrieveCmd,
    swapRetrieveCmd,
    collectCmd,
    swapCmd,
    transactions,
    history,
    exportHistory,
    swaps,
    transfers,
    incoming,
    outgoing,
    safeTransferContract,
    setSafeTransferContract,
    safeSwapContract,
    setSafeSwapContract,
    setStakingContract,
    safeSwapMap,
    setKiroTokenContract,
    setERC20TokenContract,
    setERC20TokenBalance,
    setErc20TokenRate,
    clearERC20TokenBalances,
    setCurrencyBalance,
    currency,
    desiredCurrency,
    setCurrency,
    setDesiredCurrency,
    setAllowance,
    formType,
    setDeviceInfo,
    wallet,
    gasPriceMap,
    ERC20TokenList,
  } = useAccount();

  useSwapRates();

  const [status, setStatus] = useState<boolean>(false);
  const [heightMain, setHeightMain] = useState<number>(0);
  const [heightRinkeby, setHeightRinkeby] = useState<number>(0);

  const prevBlock = usePrevious(block);
  const prevAddress = usePrevious(address);
  const prevChainId = usePrevious(chainId);
  const prevStatus = usePrevious(status);

  const [erc20TokenContractWeb3, setErc20TokenContractWeb3] = useState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new new Web3().eth.Contract(erc20ABI as any),
  );
  const [safeTransferContractWeb3, setSafeTransferContractWeb3] = useState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new new Web3().eth.Contract(safeTransferABI as any),
  );
  const [safeSwapContractWeb3, setSafeSwapContractWeb3] = useState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new new Web3().eth.Contract(safeSwapABI as any),
  );

  interface FetchTransferParams {
    store: typeof transfers;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any;
  }

  interface FetchNextTransferParams {
    store: typeof transfers;
    queryBuilder: (query: FetchQueryParams) => void;
    thresholdBlock: number;
    watch?: string;
  }

  const fetchNextTransfers = useCallback(
    ({
      store,
      queryBuilder,
      thresholdBlock,
      watch = 'ignore',
    }: FetchNextTransferParams) => {
      const fetchTransfers = ({ store, query }: FetchTransferParams) => {
        const service = KiroboService.getInstance();
        if (!service) {
          store.fetchCmd.done();
          return;
        }
        const network = getChainName(chainId < 1 ? 1 : chainId);
        if (network && block) {
          service
            ?.getService(SERVICE.TRANSFERS(network))
            .find({ query })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((payload: any) => {
              store.fetchCmd.done();
              addToStore({
                store,
                address,
                items: payload.data,
                count: payload.total,
              });
              store.setFetched(payload.skip + payload.data.length);
            })
            .catch(() => {
              store.fetchCmd.done();
            });
        } else {
          store.fetchCmd.done();
        }
      };
      if (store.fetchCmd.is.ready && !store.fetchCmd.is.running) {
        store.fetchCmd.start();
        if (store.fetched === 0 || store.fetched < store.count) {
          fetchTransfers({
            store,
            query: queryBuilder({
              address,
              $limit: store.fetchCmd.amount,
              $skip: store.fetched,
              watch,
              thresholdBlock,
            }),
          });
        } else {
          store.fetchCmd.done();
        }
      }
    },
    [address, block, chainId],
  );

  interface FetchNextTransactionsParams {
    store: typeof transfers;
    queryBuilder: (params: TransactionsQueryParams) => string;
    startBlockFrom?: number;
    endBlockTo?: number;
  }

  const fetchNextTransactions = useCallback(
    ({
      store,
      queryBuilder,
      startBlockFrom,
      endBlockTo,
    }: FetchNextTransactionsParams) => {
      const getTokenEtherscanHistory = async ({
        contractAddress,
        address,
        network,
        page,
        limit,
        startBlock,
        endBlock,
      }: {
        contractAddress: string;
        address: string;
        network: string;
        page: number;
        limit: number;
        startBlock?: number;
        endBlock?: number;
      }) => {
        return await axios.get(
          `${ETHERSCAN_URL(
            network,
          )}module=account&action=tokentx&contractaddress=${contractAddress}&address=${address}&${queryBuilder(
            {
              page,
              limit,
              startBlock: startBlock ? startBlock : 0,
              endBlock: endBlock
                ? endBlock
                : AMOUNT_OF_TRANSACTIONS_UPPER_THRESHOLD,
            },
          )}&apikey=${process.env.REACT_APP_ETHERSCAN_API_KEY as string}`,
        );
      };

      const fetchTransactions = async () => {
        try {
          const service = KiroboService.getInstance();
          if (!service) {
            store.fetchCmd.done();
            return;
          }
          const network = getChainName(chainId < 1 ? 1 : chainId);
          if (network && block) {
            let items: EtherscanTransactionsResponseDto[] | undefined =
              undefined;
            const amountToFetch = store.fetchCmd.amount;

            let amountAdded = 0;
            let page = 1;
            type Result = {
              message: string;
              result: EtherscanTransactionsResponseDto[];
              status: string;
            };
            while (
              !items ||
              (items &&
                items.length === amountToFetch &&
                amountAdded < amountToFetch)
            ) {
              const response: AxiosResponse<Result> = await axios.get(
                `${ETHERSCAN_URL(
                  network,
                )}module=account&action=txlist&address=${address}&${queryBuilder(
                  {
                    page,
                    limit: amountToFetch,
                    startBlock: startBlockFrom ? startBlockFrom : 0,
                    endBlock: endBlockTo
                      ? endBlockTo
                      : AMOUNT_OF_TRANSACTIONS_UPPER_THRESHOLD,
                  },
                )}&apikey=${process.env.REACT_APP_ETHERSCAN_API_KEY as string}`,
              );

              await wait(100);
              const tokensResponse: AxiosResponse<Result> =
                await getTokenEtherscanHistory({
                  network,
                  page,
                  address,
                  contractAddress:
                    tokens.KIRO.address[chainId.toString() as '1' | '4'],
                  limit: amountToFetch,
                  startBlock: startBlockFrom ? startBlockFrom : 0,
                  endBlock: endBlockTo
                    ? endBlockTo
                    : AMOUNT_OF_TRANSACTIONS_UPPER_THRESHOLD,
                });

              // const tokensResponses = await Promise.all(
              //   Object.keys(tokens).map((token) => {
              //     const currentPage = page;
              //     return getTokenEtherscanHistory({
              //       network,
              //       page: currentPage,
              //       address,
              //       contractAddress:
              //         tokens[token as keyof typeof tokens].address[
              //           chainId.toString() as '1' | '4'
              //         ],
              //       limit: amountToFetch,
              //       startBlock: startBlockFrom ? startBlockFrom : 0,
              //       endBlock: endBlockTo
              //         ? endBlockTo
              //         : AMOUNT_OF_TRANSACTIONS_UPPER_THRESHOLD,
              //     })
              //   })
              // )

              if (
                response.data.status !== '1' &&
                tokensResponse.data.status !== '1'
              ) {
                if (
                  response.data.message === 'No transactions found' &&
                  tokensResponse.data.message === 'No transactions found'
                ) {
                  break;
                }
                await wait(1000);
                continue;
              }
              items = response.data.result.concat(tokensResponse.data.result);
              items?.sort(
                (
                  a: EtherscanTransactionsResponseDto,
                  b: EtherscanTransactionsResponseDto,
                ) => Number(b.blockNumber) - Number(a.blockNumber),
              ) as EtherscanTransactionsResponseDto[];

              if (items && page < 2) {
                store.setLastFetchedBlockNumber(
                  items.length ? items[0].blockNumber : block,
                );
                store.setFirstFetchedBlockNumber(
                  items.length ? items[items.length - 1].blockNumber : 0,
                );
              }
              page++;
              const KIROBO_CONTRACTS = {
                [safeTransferContract?.address?.toLowerCase() || Symbol()]:
                  true,
                [safeSwapMap.get(getChainName(chainId))?.address || Symbol()]:
                  true,
              };

              const itemsToAdd = items
                ? items
                  .filter(item => item.isError === '0' || !item.isError) // failed transaction: revert, assert, etc.
                  .filter(item => item.to !== '') // create contract transaction
                  .filter(
                    item => Boolean(item.value) && Number(item.value) > 0,
                  ) // create contract transaction
                  .filter(
                    item =>
                      !KIROBO_CONTRACTS[item.from] &&
                      !KIROBO_CONTRACTS[item.to],
                  )
                : []; // safeTransfer & safeSwap contracts interaction
              // .filter(
              //   (item) =>
              //     +item.gasUsed <= 21000 + ((item.input.length - 2) * 8) / 2
              // ) // contract interaction
              const filledItemsToAdd = itemsToAdd.map(item => {
                if (!item.tokenSymbol) {
                  return item;
                }
                item.token = {
                  address:
                    tokens[item.tokenSymbol as keyof typeof tokens].address[
                    chainId.toString() as '1' | '4'
                    ] || '',
                  symbol: item.tokenSymbol || '',
                  decimals: Number(item.tokenDecimal) || 18,
                  type: 'ERC20',
                };
                return item;
              });
              const prevTransactionsAmount = store.list.length;
              if (filledItemsToAdd && filledItemsToAdd.length) {
                addTransactionsToStore({
                  store,
                  address,
                  items: filledItemsToAdd,
                  count: AMOUNT_OF_TRANSACTIONS_UPPER_THRESHOLD,
                });
              }

              const newTransactionsAmount = store.list.length;
              amountAdded += newTransactionsAmount - prevTransactionsAmount;
              store.setFetched(store.list.length);
              if (items && items.length < amountToFetch) {
                store.setCount(store.list.length);
              }
            }
            store.fetchCmd.done();
          } else {
            store.fetchCmd.done();
          }
        } catch (e) {
          const error = e as { message: string; reason: string };
          store.fetchCmd.failed({ message: error.message || error.reason });
        }
      };

      if (!store.fetchCmd.is.ready || store.fetchCmd.is.running) return;
      store.fetchCmd.start();
      fetchTransactions();
    },
    [address, block, chainId],
  );

  const __block = useRef(block);
  const __transfers = useRef(transfers);
  const __incoming = useRef(incoming);
  const __outgoing = useRef(outgoing);
  const __transactions = useRef(transactions);
  const __history = useRef(history);
  const __exportHistory = useRef(exportHistory);
  const __swaps = useRef(swaps);
  const __fetchNextTransfers = useRef(fetchNextTransfers);
  const __fetchNextTransactions = useRef(fetchNextTransactions);
  const __prevAddress = useRef(prevAddress);
  const __prevChainId = useRef(prevChainId);
  const __prevBlock = useRef(prevBlock);
  const __prevStatus = useRef(prevStatus);
  const __setBalance = useRef(setBalance);
  const __setGasPrice = useRef(setGasPrice);
  const __setMaxRewards = useRef(setMaxRewards);
  const __setRewardsParams = useRef(setRewardsParams);
  const __setStakingBalance = useRef(setStakingBalance);
  const __setTokenBalance = useRef(setTokenBalance);
  const __setBlock = useRef(setBlock);
  const __active = useRef(active);
  const __address = useRef(address);
  const __swapperAddress = useRef(swapperAddress);
  const __setSwapperBalance = useRef(setSwapperBalance);
  const __chainId = useRef(chainId);
  const __connectCmd = useRef(connectCmd);
  const __disconnectCmd = useRef(disconnectCmd);
  const __depositCmd = useRef(depositCmd);
  const __sendCmd = useRef(sendCmd);
  const __swapDepositCmd = useRef(swapDepositCmd);
  const __approvedCmd = useRef(approvedCmd);
  const __collectCmd = useRef(collectCmd);
  const __swapCmd = useRef(swapCmd);
  const __retrieveCmd = useRef(retrieveCmd);
  const __swapRetrieveCmd = useRef(swapRetrieveCmd);
  const __erc20TokenContractWeb3 = useRef(erc20TokenContractWeb3);
  const __safeTransferContractWeb3 = useRef(safeTransferContractWeb3);
  const __safeSwapContractWeb3 = useRef(safeSwapContractWeb3);
  const __web3 = useRef(web3);
  const __setRate = useRef(setRate);
  const __setSafeTransferContract = useRef(setSafeTransferContract);
  const __safeTransferContract = useRef(safeTransferContract);
  const __setSafeSwapContract = useRef(setSafeSwapContract);
  const __safeSwapContract = useRef(safeSwapContract);
  const __setStakingContract = useRef(setStakingContract);
  const __setDeviceInfo = useRef(setDeviceInfo);
  const __setKiroTokenContract = useRef(setKiroTokenContract);
  const __setERC20TokenContract = useRef(setERC20TokenContract);
  const __setERC20TokenBalance = useRef(setERC20TokenBalance);
  const __setErc20TokenRate = useRef(setErc20TokenRate);
  //const __web3Activate = useRef(web3Activate);

  const __setCurrencyBalance = useRef(setCurrencyBalance);

  const __clearERC20TokenBalances = useRef(clearERC20TokenBalances);
  const __ERC20TokenList = useRef(ERC20TokenList);
  const __gasPriceMap = useRef(gasPriceMap);
  const __web3Connect = useRef(web3Connect);
  const __web3Disconnect = useRef(web3Disconnect);
  const __setActive = useRef(setActive);
  const __setAddress = useRef(setAddress);
  const __setCanGetRewards = useRef(setCanGetRewards);
  const __setChainId = useRef(setChainId);
  const __wallet = useRef(wallet);

  const __currency = useRef(currency);
  const __desiredCurrency = useRef(desiredCurrency);
  const __setCurrency = useRef(setCurrency);
  const __setDesiredCurrency = useRef(setDesiredCurrency);
  const __setAllowance = useRef(setAllowance);
  const __formType = useRef(formType);

  useEffect(() => {
    __block.current = block;
    __swapperAddress.current = swapperAddress;
    __setSwapperBalance.current = setSwapperBalance;
    __transfers.current = transfers;
    __incoming.current = incoming;
    __outgoing.current = outgoing;
    __transactions.current = transactions;
    __history.current = history;
    __swaps.current = swaps;
    __fetchNextTransfers.current = fetchNextTransfers;
    __fetchNextTransactions.current = fetchNextTransactions;
    __prevAddress.current = prevAddress;
    __prevChainId.current = prevChainId;
    __prevBlock.current = prevBlock;
    __prevStatus.current = prevStatus;
    __setBalance.current = setBalance;
    __setGasPrice.current = setGasPrice;
    __setMaxRewards.current = setMaxRewards;
    __setRewardsParams.current = setRewardsParams;
    __setTokenBalance.current = setTokenBalance;
    __setStakingBalance.current = setStakingBalance;
    __setBlock.current = setBlock;
    __active.current = active;
    __address.current = address;
    __chainId.current = chainId;
    __connectCmd.current = connectCmd;
    __disconnectCmd.current = disconnectCmd;
    __approvedCmd.current = approvedCmd;
    __depositCmd.current = depositCmd;
    __sendCmd.current = sendCmd;
    __swapDepositCmd.current = swapDepositCmd;
    __collectCmd.current = collectCmd;
    __swapCmd.current = swapCmd;
    __retrieveCmd.current = retrieveCmd;
    __swapRetrieveCmd.current = swapRetrieveCmd;
    __erc20TokenContractWeb3.current = erc20TokenContractWeb3;
    __safeTransferContractWeb3.current = safeTransferContractWeb3;
    __safeSwapContractWeb3.current = safeSwapContractWeb3;
    __web3.current = web3;
    __setRate.current = setRate;
    __setSafeTransferContract.current = setSafeTransferContract;
    __safeTransferContract.current = safeTransferContract;
    __setSafeSwapContract.current = setSafeSwapContract;
    __safeSwapContract.current = safeSwapContract;

    __setCurrency.current = setCurrency;
    __setDesiredCurrency.current = setDesiredCurrency;
    __setAllowance.current = setAllowance;
    __formType.current = formType;
    __setStakingContract.current = setStakingContract;
    __setDeviceInfo.current = setDeviceInfo;
    __setKiroTokenContract.current = setKiroTokenContract;
    __setERC20TokenContract.current = setERC20TokenContract;
    __setERC20TokenBalance.current = setERC20TokenBalance;
    __setErc20TokenRate.current = setErc20TokenRate;
    __setCurrencyBalance.current = setCurrencyBalance;
    __currency.current = currency;
    __desiredCurrency.current = desiredCurrency;
    __clearERC20TokenBalances.current = clearERC20TokenBalances;
    __ERC20TokenList.current = ERC20TokenList;
    __gasPriceMap.current = gasPriceMap;
    __web3Connect.current = web3Connect;
    __web3Disconnect.current = web3Disconnect;
    __setActive.current = setActive;
    __setAddress.current = setAddress;
    __setCanGetRewards.current = setCanGetRewards;
    __setChainId.current = setChainId;

    __wallet.current = wallet;
  });


  useEffect(() => {
    const wallet = __wallet.current;
    if (!wallet.removeAddressCmd.is.ready || wallet.removeAddressCmd.is.running)
      return;

    try {
      wallet.removeAddressCmd.start();
      if (!wallet.mnemonic.data) throw new Error('no mnemonic');

      wallet.removeAddressCmd.done();
    } catch (e) {
      const err = e as any;
      wallet.removeAddressCmd.failed({ message: err.message || err.reason });
    }
  }, [wallet.removeAddressCmd.is.ready]);


  useEffect(() => {
    const web3 = __web3.current;
    const chainId = __chainId.current;
    const currency = __currency.current;
    const safeSwapContract = __safeSwapContract.current;
    const safeTransferContract = __safeTransferContract.current;
    const setTokenBalance = __setTokenBalance.current;

    if (currency.symbol !== 'ETH') {
      (async function checkAllowance() {
        try {
          const service = KiroboService.getInstance();
          const network = getChainName(chainId);
          if (!service) throw new Error('service not started');
          if (!__active.current) throw new Error('web3 not connected');
          if (!network) throw new Error('chain is not supported');
          if (!web3) throw new Error('web3 is not provided');
          setTokenBalance(currency.balance);
          await setErc20TokenContractWeb3(
            new web3.eth.Contract(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              erc20ABI as any,
              currency.address,
            ),
          );
          const erc20TokenContractWeb3 = __erc20TokenContractWeb3.current;
          if (!erc20TokenContractWeb3)
            throw new Error('erc20Token contract not found');
          const contract =
            formType === 'swap' ? safeSwapContract : safeTransferContract;

          const allowance = await erc20TokenContractWeb3.methods
            .allowance(address, contract?.address)
            .call();

          __setAllowance.current(allowance);
        } catch (e) {
          const err = e as any;

          console.log(`check allowance failed: ${err.message || err.reason}`);
        }
      })();
    } else {
      const network = getChainName(chainId);
      const kiroToken = __ERC20TokenList
        .current(network)
        .find(token => token?.symbol === 'KIRO');
      if (kiroToken?.balance) setTokenBalance(kiroToken?.balance);
    }
  }, [
    currency.symbol,
    currency.address,
    connectCmd.is.done,
    formType,
    address,
  ]);

  useEffect(() => {
    const web3 = __web3.current;
    const active = __active.current;
    const chainId = __chainId.current;
    const address = __address.current;
    const approvedCmd = __approvedCmd.current;
    const erc20TokenContractWeb3 = __erc20TokenContractWeb3.current;
    const currency = __currency.current;
    if (
      approvedCmd.is.ready &&
      !approvedCmd.is.running &&
      currency.symbol !== 'ETH'
    ) {
      approvedCmd.start();
      (async function runApprovedCmd() {
        try {
          const service = KiroboService.getInstance();
          const network = getChainName(chainId);
          const { amount } = approvedCmd;
          if (!service) throw new Error('service not started');
          if (!active) throw new Error('web3 not connected');
          if (!network) throw new Error('chain is not supported');
          if (!erc20TokenContractWeb3)
            throw new Error('erc20Token contract not found');

          const gasPrice = gasPriceMap.get(network);

          let gas;
          try {
            gas = toBN(
              await erc20TokenContractWeb3.methods
                .approve(approvedCmd.contractAddress, web3.utils.toBN(amount))
                .estimateGas({ from: address }),
            )
              .mul(toBN(11))
              .div(toBN(10))
              .toString();
          } catch {
            gas = 60000;
          }

          const approve = await erc20TokenContractWeb3.methods
            .approve(approvedCmd.contractAddress, web3.utils.toBN(amount))
            .send({ from: address, gasPrice, gas });

          if (approve) {
            const allowance = await erc20TokenContractWeb3.methods
              .allowance(address, approvedCmd.contractAddress)
              .call();
            __setAllowance.current(allowance);
          }
          approvedCmd.done();
        } catch (e) {
          const err = e as any;

          approvedCmd.failed({ message: err.message || err.reason });
        }
      })();
    }
  }, [approvedCmd.is.ready]);

  // on account.deposit command
  useEffect(() => {
    const active = __active.current;
    const address = __address.current;
    const sendCmd = __sendCmd.current;
    const currency = __currency.current;
    const erc20TokenContractWeb3 = __erc20TokenContractWeb3.current;

    if (sendCmd.is.ready && !sendCmd.is.running) {
      sendCmd.start();
      (async function runSendCmd() {
        try {
          const { from, to, value } = sendCmd;

          const network = getChainName(chainId);
          const gasPrice = gasPriceMap.get(network);

          if (!active) throw new Error('web3 not connected');
          if (!network) throw new Error('chain is not supported');
          if (!erc20TokenContractWeb3)
            throw new Error('erc20Token contract not found');
          if (from !== address) throw new Error('from does not match address');

          if (currency.symbol !== 'ETH') {
            let gas;
            try {
              gas = toBN(
                await erc20TokenContractWeb3.methods.transfer(to, value),
              )
                .mul(toBN(11))
                .div(toBN(10))
                .toString();
            } catch {
              gas = 60000;
            }
            await erc20TokenContractWeb3.methods
              .transfer(to, value)
              .send({ from: address, gasPrice, gas });
          } else {
            const res = await web3.eth.sendTransaction({
              value,
              to,
              from,
              gasPrice,
            });
            const item: EtherscanTransactionsResponseDto = {
              from: address,
              to,
              value,
              gas: '',
              gasPrice: `${gasPrice}`,
              hash: res.transactionHash,
              timeStamp: `${Date.now() / 1000}`,
              blockNumber: `${res.blockNumber}`,
              isError: '0',
              cumulativeGasUsed: `${res.cumulativeGasUsed}`,
              gasUsed: `${res.gasUsed}`,
              input: '',
            };
            putTransactionInStore({
              store: __transactions.current,
              address,
              item,
            });
          }

          sendCmd.done();
        } catch (e) {
          const err = e as any;
          console.error(`err = ${JSON.stringify(err.message)}`);

          sendCmd.failed({ message: err.message });
        }
      })();
    }
  }, [sendCmd.is.ready]);

  useEffect(() => {
    const active = __active.current;
    const address = __address.current;
    const chainId = __chainId.current;
    const depositCmd = __depositCmd.current;
    const safeTransferContractWeb3 = __safeTransferContractWeb3.current;
    if (depositCmd.is.ready && !depositCmd.is.running) {
      depositCmd.start();
      (async function runDepositCmd() {
        try {
          const service = KiroboService.getInstance();
          const network = getChainName(chainId);
          const {
            from,
            to,
            value,
            publicSalt,
            privateSalt,
            secretHash,
            message,
          } = depositCmd;

          if (!service) throw new Error('service not started');
          if (!active) throw new Error('web3 not connected');
          if (!network) throw new Error('chain is not supported');
          if (!safeTransferContractWeb3)
            throw new Error('safeTransfer contract not found');
          if (from !== address) throw new Error('from does not match address');

          interface ServiceRequestParams {
            from: string;
            to: string;
            value: string;
            publicSalt: string;
            privateSalt: string;
            secretHash: string;
            message: string;
            token?: EthTokenInfo;
          }
          const serviceRequestParams: ServiceRequestParams = {
            from,
            to,
            value,
            publicSalt,
            privateSalt,
            secretHash,
            message,
          };
          const currency = __currency.current;
          if (currency.symbol !== 'ETH') {
            serviceRequestParams.token = {
              address: currency.address,
              decimals: currency.decimals,
              symbol: currency.symbol,
              type: 'ERC20',
            };
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const request: any = await service
            .getService(SERVICE.TRANSFER_REQUEST(network))
            .create(serviceRequestParams);

          const total = toBN(value).add(toBN(request.fees));
          const gasPrice = gasPriceMap.get(network);

          let gas;
          try {
            gas = toBN(
              currency.symbol !== 'ETH'
                ? await safeTransferContractWeb3.methods
                  .depositERC20(
                    currency.address,
                    currency.symbol,
                    to,
                    value,
                    request.fees,
                    secretHash,
                  )
                  .estimateGas({ from: address, value: request.fees })
                : await safeTransferContractWeb3.methods
                  .deposit(to, value, request.fees, secretHash)
                  .estimateGas({ from: address, value: total }),
            )
              .mul(toBN(11))
              .div(toBN(10))
              .toString();
          } catch {
            gas = 60000;
          }

          const sendPayload: any = {
            from,
            gasPrice,
            gas,
          };


          sendPayload.nonce = await __web3.current.eth.getTransactionCount(
            address,
            'pending',
          );


          const txid =
            currency.symbol !== 'ETH'
              ? await new Promise((resolve, reject) => {
                safeTransferContractWeb3.methods
                  .depositERC20(
                    currency.address,
                    currency.symbol,
                    to,
                    value,
                    request.fees,
                    secretHash,
                  )
                  .send({ ...sendPayload, value: request.fees })
                  .on('transactionHash', (hash: string) => resolve(hash))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .on('error', (err: any) => reject(err));
              })
              : await new Promise((resolve, reject) => {
                safeTransferContractWeb3.methods
                  .deposit(to, value, request.fees, secretHash)
                  .send({ ...sendPayload, value: total })
                  .on('transactionHash', (hash: string) => resolve(hash))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .on('error', (err: any) => reject(err));
              });
          const hex =
            currency.symbol !== 'ETH'
              ? safeTransferContractWeb3.methods
                .depositERC20(
                  currency.address,
                  currency.symbol,
                  to,
                  value,
                  request.fees,
                  secretHash,
                )
                .encodeABI()
              : safeTransferContractWeb3.methods
                .deposit(to, value, request.fees, secretHash)
                .encodeABI();

          await service.getService(SERVICE.FOLLOW(network)).create({
            txid,
            hex,
          });

          const item = {
            ...request,
            collect: { broadcasted: -1, confirmed: -1, txid: '' },
            deposit: { txid, broadcasted: -1, confirmed: -1 },
            expires: { at: request.expiresAt },
            state: 'creating',
            retrieve: { broadcasted: -1, confirmed: -1, txid: '' },
            message,
            txid,
            salt: request.publicSalt,
            updatedAt: request.createdAt,
            token:
              currency.symbol !== 'ETH'
                ? {
                  address: currency.address,
                  decimals: currency.decimals,
                  symbol: currency.symbol,
                  type: 'ERC20',
                }
                : undefined,
          };
          depositCmd.done();
          putInStore({
            store: __outgoing.current,
            address,
            item,
          });
          putInStore({
            store: __transfers.current,
            address,
            item,
          });
        } catch (e) {
          console.error('fees: error', 4, e);
          const err = e as any;

          depositCmd.failed({
            message: `${err.message || err.reason} ${currency?.symbol} ${safeTransferContractWeb3.methods
              }`,
          });
        }
      })();
    }
  }, [depositCmd.is.ready]);

  useEffect(() => {
    const active = __active.current;
    const address = __address.current;
    const chainId = __chainId.current;
    const swapDepositCmd = __swapDepositCmd.current;
    const safeSwapContractWeb3 = __safeSwapContractWeb3.current;
    if (swapDepositCmd.is.ready && !swapDepositCmd.is.running) {
      swapDepositCmd.start();
      (async function runDepositCmd() {
        try {
          const service = KiroboService.getInstance();
          const network = getChainName(chainId);
          const {
            from,
            to,
            value,
            desiredValue,
            publicSalt,
            privateSalt,
            secretHash,
            message,
          } = swapDepositCmd;

          if (!service) throw new Error('service not started');
          if (!active) throw new Error('web3 not connected');
          if (!network) throw new Error('chain is not supported');
          if (!safeSwapContractWeb3)
            throw new Error('safeSwap contract not found');
          if (from !== address) throw new Error('from does not match address');

          interface EthInterchangeInfo {
            value: string;
            token?: EthTokenInfo;
          }
          interface ServiceRequestParams {
            from: string;
            to: string;
            value: string;
            publicSalt: string;
            privateSalt: string;
            secretHash: string;
            message: string;
            token?: EthTokenInfo;
            interchange: EthInterchangeInfo;
          }

          const serviceRequestParams: ServiceRequestParams = {
            from,
            to,
            value,
            publicSalt,
            privateSalt,
            secretHash,
            message,
            interchange: {
              value: desiredValue,
            },
          };

          if (__currency.current.symbol !== 'ETH') {
            serviceRequestParams.token = {
              address: __currency.current.address,
              decimals: __currency.current.decimals,
              symbol: __currency.current.symbol,
              type: 'ERC20',
            };
          }
          if (__desiredCurrency.current.symbol !== 'ETH') {
            serviceRequestParams.interchange.token = {
              address: __desiredCurrency.current.address,
              decimals: __desiredCurrency.current.decimals,
              symbol: __desiredCurrency.current.symbol,
              type: 'ERC20',
            };
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const request: any = await service
            .getService(SERVICE.TRANSFER_REQUEST(network))
            .create(serviceRequestParams);

          const total = toBN(value).add(toBN(request.fees));
          const gasPrice = gasPriceMap.get(network);
          const sendValue = currency.symbol === 'ETH' ? total : request.fees;

          let gas;
          try {
            gas = toBN(
              await safeSwapContractWeb3.methods
                .deposit(
                  to,
                  currency.address,
                  value,
                  request.fees,
                  desiredCurrency.address,
                  desiredValue,
                  request.swap.fees,
                  secretHash,
                )
                .estimateGas({ from: address, value: sendValue }),
            )
              .mul(toBN(11))
              .div(toBN(10))
              .toString();
          } catch {
            gas = 120000;
          }

          const sendPayload: any = {
            from,
            gasPrice,
            gas,
            value: sendValue,
          };

          sendPayload.nonce = await __web3.current.eth.getTransactionCount(
            address,
            'pending',
          );


          const txid: string = await new Promise((resolve, reject) => {
            safeSwapContractWeb3.methods
              .deposit(
                to,
                currency.address,
                value,
                request.fees,
                desiredCurrency.address,
                desiredValue,
                request.swap.fees,
                secretHash,
              )
              .send(sendPayload)
              .on('transactionHash', (hash: string) => resolve(hash))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .on('error', (err: any) => reject(err));
          });

          const hex = safeSwapContractWeb3.methods
            .deposit(
              to,
              currency.address,
              value,
              request.fees,
              desiredCurrency.address,
              desiredValue,
              request.swap.fees,
              secretHash,
            )
            .encodeABI();

          await service.getService(SERVICE.FOLLOW(network)).create({
            txid,
            hex,
          });

          swapDepositCmd.done();

          putInStore({
            store: __swaps.current,
            address,
            item: {
              ...request,
              collect: { broadcasted: -1, confirmed: -1, txid: '' },
              deposit: { txid, broadcasted: -1, confirmed: -1 },
              swap: { txid: '', broadcasted: -1, confirmed: -1 },
              expires: { at: request.expiresAt },
              state: 'creating',
              retrieve: { broadcasted: -1, confirmed: -1, txid: '' },
              message,
              txid,
              salt: request.publicSalt,
              updatedAt: request.createdAt,
              token:
                currency.symbol !== 'ETH'
                  ? {
                    address: currency.address,
                    decimals: currency.decimals,
                    symbol: currency.symbol,
                    type: 'ERC20',
                  }
                  : undefined,
              interchange: {
                value: desiredValue,
                token: {
                  address: __desiredCurrency.current.address,
                  decimals: __desiredCurrency.current.decimals,
                  symbol: __desiredCurrency.current.symbol,
                  type: 'ERC20',
                },
                fees: request.swap.fees,
              },
            },
          });
        } catch (e) {
          console.error('fees: error swapDepositCmd', 4, e);
          const err = e as any;

          swapDepositCmd.failed({ message: err.message || err.reason });
        }
      })();
    }
  }, [swapDepositCmd.is.ready]);

  // on account.retrieve command
  useEffect(() => {
    const active = __active.current;
    const address = __address.current;
    const chainId = __chainId.current;
    const retrieveCmd = __retrieveCmd.current;
    const safeTransferContractWeb3 = __safeTransferContractWeb3.current;
    if (retrieveCmd.is.ready && !retrieveCmd.is.running) {
      retrieveCmd.start();
      (async function runRetrieveCmd() {
        try {
          const service = KiroboService.getInstance();
          const network = getChainName(chainId);

          if (!service) throw new Error('service not started');
          if (!active) throw new Error('web3 not connected');
          if (!network) throw new Error('chain is not supported');
          if (!safeTransferContractWeb3)
            throw new Error('safeTransfer contract not found');

          const transfer = transfers.map.get(retrieveCmd.id);
          if (!transfer) throw new Error('transfer not found');

          const { from, to, fees, value, secretHash, token } = transfer;
          if (from !== address)
            throw new Error('from address does not match connected address');
          const gasPrice = gasPriceMap.get(network);

          let gas;
          try {
            gas = toBN(
              token.symbol && token.symbol !== 'ETH'
                ? await safeTransferContractWeb3.methods
                  .retrieveERC20(
                    token.address,
                    token.symbol,
                    to,
                    value,
                    fees,
                    secretHash,
                  )
                  .estimateGas({ from: address })
                : await safeTransferContractWeb3.methods
                  .retrieve(to, value, fees, secretHash)
                  .estimateGas({ from: address }),
            )
              .mul(toBN(11))
              .div(toBN(10))
              .toString();
          } catch {
            gas = 120000;
          }

          const sendPayload: any = {
            from,
            gasPrice,
            gas,
          };


          sendPayload.nonce = await __web3.current.eth.getTransactionCount(
            address,
            'pending',
          );

          const txid =
            token.symbol && token.symbol !== 'ETH'
              ? await new Promise((resolve, reject) => {
                safeTransferContractWeb3.methods
                  .retrieveERC20(
                    token.address,
                    token.symbol,
                    to,
                    value,
                    fees,
                    secretHash,
                  )
                  .send(sendPayload)
                  .on('transactionHash', (hash: string) => resolve(hash))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .on('error', (err: any) => reject(err));
              })
              : await new Promise((resolve, reject) => {
                safeTransferContractWeb3.methods
                  .retrieve(to, value, fees, secretHash)
                  .send(sendPayload)
                  .on('transactionHash', (hash: string) => resolve(hash))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .on('error', (err: any) => reject(err));
              });

          const hex =
            token.symbol && token.symbol !== 'ETH'
              ? safeTransferContractWeb3.methods
                .retrieveERC20(
                  token.address,
                  token.symbol,
                  to,
                  value,
                  fees,
                  secretHash,
                )
                .encodeABI()
              : safeTransferContractWeb3.methods
                .retrieve(to, value, fees, secretHash)
                .encodeABI();

          await service.getService(SERVICE.FOLLOW(network)).create({
            txid,
            hex,
          });

          const payload: any = {
            id: transfer.id,
            state: 'retrieving',
          };
          if (txid) payload.txid = txid;
          __outgoing.current.update(address, payload);
          __transfers.current.update(address, payload);
          retrieveCmd.done();
        } catch (e) {
          console.error('fees: error undo', 4, e);
          const err = e as any;

          retrieveCmd.failed({ message: err.message || err.reason });
        }
      })();
    }
  }, [retrieveCmd.is.ready]);

  // on account.swapRetrieve command
  useEffect(() => {
    const active = __active.current;
    const address = __address.current;
    const chainId = __chainId.current;
    const swaps = __swaps.current;
    const swapRetrieveCmd = __swapRetrieveCmd.current;
    const safeSwapContractWeb3 = __safeSwapContractWeb3.current;
    if (swapRetrieveCmd.is.ready && !swapRetrieveCmd.is.running) {
      swapRetrieveCmd.start();
      (async function runSwapRetrieveCmd() {
        try {
          const service = KiroboService.getInstance();
          const network = getChainName(chainId);
          if (!service) throw new Error('service not started');
          if (!active) throw new Error('web3 not connected');
          if (!network) throw new Error('chain is not supported');
          if (!safeSwapContractWeb3)
            throw new Error('safeSwap contract not found');
          const transfer = swaps.map.get(swapRetrieveCmd.id);
          if (!transfer) throw new Error('transfer not found');

          const { from, to, fees, value, secretHash, token, swap } = transfer;

          if (from !== address)
            throw new Error('from address does not match connected address');
          const gasPrice = gasPriceMap.get(network);

          let gas;
          try {
            gas = toBN(
              await safeSwapContractWeb3.methods
                .retrieve(
                  to,
                  token.address || '0x0000000000000000000000000000000000000000',
                  value,
                  fees,
                  swap.token.address ||
                  '0x0000000000000000000000000000000000000000',
                  swap.value,
                  swap.fees,
                  secretHash,
                )
                .estimateGas({ from: address }),
            )
              .mul(toBN(11))
              .div(toBN(10))
              .toString();
          } catch {
            gas = 120000;
          }

          const sendPayload: any = {
            from,
            gasPrice,
            gas,
          };


          sendPayload.nonce = await __web3.current.eth.getTransactionCount(
            address,
            'pending',
          );


          const txid = await new Promise((resolve, reject) => {
            safeSwapContractWeb3.methods
              .retrieve(
                to,
                token.address || '0x0000000000000000000000000000000000000000',
                value,
                fees,
                swap.token.address ||
                '0x0000000000000000000000000000000000000000',
                swap.value,
                swap.fees,
                secretHash,
              )
              .send(sendPayload)
              .on('transactionHash', (hash: string) => resolve(hash))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .on('error', (err: any) => reject(err));
          });

          const hex = await safeSwapContractWeb3.methods
            .retrieve(
              to,
              token.address || '0x0000000000000000000000000000000000000000',
              value,
              fees,
              swap.token.address ||
              '0x0000000000000000000000000000000000000000',
              swap.value,
              swap.fees,
              secretHash,
            )
            .encodeABI();

          await service.getService(SERVICE.FOLLOW(network)).create({
            txid,
            hex,
          });

          const payload: any = {
            id: transfer.id,
            state: 'retrieving',
          };
          if (txid) payload.txid = txid;
          __swaps.current.update(address, payload);
          swapRetrieveCmd.done();
        } catch (e) {
          console.error('fees: error undo swap', 4, e);
          const err = e as any;

          swapRetrieveCmd.failed({ message: err.message || err.reason });
        }
      })();
    }
  }, [swapRetrieveCmd.is.ready]);

  // on account.collect command
  useEffect(() => {
    const chainId = __chainId.current;
    const collectCmd = __collectCmd.current;
    const safeTransferContractWeb3 = __safeTransferContractWeb3.current;
    const address = __address.current;

    if (collectCmd.is.ready && !collectCmd.is.running) {
      collectCmd.start();
      (async function runCollectCmd() {
        try {
          const service = KiroboService.getInstance();
          const network = getChainName(chainId < 1 ? 1 : chainId);
          const { id, key } = collectCmd;

          if (!service) throw new Error('service not started');
          if (!network) throw new Error('chain is not supported');
          if (!safeTransferContractWeb3)
            throw new Error('safeTransfer contract not found');

          await service.getService(SERVICE.COLLECT(network)).create({ id, key });
          __incoming.current.update(address, { id, state: 'collecting' });
          __transfers.current.update(address, { id, state: 'collecting' });
          collectCmd.done();
        } catch (e) {
          const err = e as any;

          collectCmd.failed({ message: err.name || err.message || err.reason });
        }
      })();
    }
  }, [collectCmd.is.ready]);

  // on account.swap command
  useEffect(() => {
    const chainId = __chainId.current;
    const swapCmd = __swapCmd.current;
    const safeSwapContractWeb3 = __safeSwapContractWeb3.current;
    const address = __address.current;

    if (swapCmd.is.ready && !swapCmd.is.running) {
      swapCmd.start();
      (async function runswapCmdCmd() {
        try {
          const service = KiroboService.getInstance();
          const network = getChainName(chainId < 1 ? 1 : chainId);
          const { id, key } = swapCmd;

          if (!service) throw new Error('service not started');
          if (!network) throw new Error('chain is not supported');
          if (!safeSwapContractWeb3)
            throw new Error('safeTransfer contract not found');

          const request: any = await service
            .getService(SERVICE.SWAP(network))
            .create({ id, key });
          const transfer = swaps.map.get(swapCmd.id);

          if (!transfer) throw new Error('transfer not found');

          const { from, to, fees, value, secretHash, token, swap } = transfer;
          const gasPrice = gasPriceMap.get(network);

          const ethValue =
            !swap.token.symbol || swap.token.symbol === 'ETH'
              ? toBN(swap.value).add(toBN(swap.fees)).toString()
              : swap.fees;

          let gas;
          try {
            gas = toBN(
              await safeSwapContractWeb3.methods
                .swap(
                  from,
                  token.address || '0x0000000000000000000000000000000000000000',
                  value,
                  fees,
                  swap.token.address ||
                  '0x0000000000000000000000000000000000000000',
                  swap.value,
                  swap.fees,
                  secretHash,
                  request.secret,
                )
                .estimateGas({ from: to, value: ethValue }),
            )
              .mul(toBN(11))
              .div(toBN(10))
              .toString();
          } catch {
            gas = 120000;
          }

          const sendPayload: any = {
            from: to,
            gasPrice,
            gas,
            value: ethValue,
          };


          sendPayload.nonce = await __web3.current.eth.getTransactionCount(
            address,
            'pending',
          );


          const txid = await new Promise((resolve, reject) => {
            safeSwapContractWeb3.methods
              .swap(
                from,
                token.address || '0x0000000000000000000000000000000000000000',
                value,
                fees,
                swap.token.address ||
                '0x0000000000000000000000000000000000000000',
                swap.value,
                swap.fees,
                secretHash,
                request.secret,
              )
              .send(sendPayload)
              .on('transactionHash', (hash: string) => resolve(hash))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .on('error', (err: any) => reject(err));
          });

          const hex = await safeSwapContractWeb3.methods
            .swap(
              from,
              token.address || '0x0000000000000000000000000000000000000000',
              value,
              fees,
              swap.token.address ||
              '0x0000000000000000000000000000000000000000',
              swap.value,
              swap.fees,
              secretHash,
              request.secret,
            )
            .encodeABI();

          await service.getService(SERVICE.FOLLOW(network)).create({
            txid,
            hex,
          });

          const payload: any = {
            id: transfer.id,
            state: 'swapping',
          };

          if (txid) payload.txid = txid;
          __swaps.current.update(address, payload);
          swapCmd.done();
        } catch (e) {
          console.log('swapcmd err', e);
          const err = e as any;

          swapCmd.failed({ message: err.name || err.message || err.reason });
        }
      })();
    }
  }, [swapCmd.is.ready]);

  // init
  useEffect(() => {
    const authDetails = {
      key: apiKey,
      secret: apiSecret,
    };

    KiroboService.createInstance(
      {
        key: authDetails.key,
        secret: authDetails.secret,
      },
      (message: string, payload: any) => {
        const setCanGetRewards = __setCanGetRewards.current;
        if (message === 'authorized') {
          setCanGetRewards(!!payload?.rewards);
          setStatus(true);
        }
        if (message === 'disconnected') {
          setCanGetRewards(!!payload?.rewards);
          setStatus(false);
        }
      },
    );
    return () => {
      KiroboService.createInstance({ key: '', secret: '' });
    };
  }, []);

  // on api server authorized event
  useEffect(() => {
    const service = KiroboService.getInstance();
    console.log({ status, service });
    if (status && service) {
      const networkService = service.getService(SERVICE.NETWORKS);
      const ratesService = service.getService(SERVICE.RATES);
      const tokenRatesService = service.getService(SERVICE.TOKEN_RATES);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setNetworkDetails = (network: any) => {
        __setGasPrice.current(network.netId, network.gasPrice);
        if (network.netId === 'main') setHeightMain(network.height);
        else if (network.netId === 'rinkeby') setHeightRinkeby(network.height);
      };

      networkService
        .find({ query: { watch: 'replace' } })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(async (networks: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tokenRatesService.on('patched', (rates: any) => {
            for (const network of networks.data) {
              const token = __ERC20TokenList
                .current(network.netId)
                .find(token => token.symbol === rates.symbol);
              __setErc20TokenRate.current(
                network.netId,
                token?.address as string,
                rates.usd,
              );
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ratesService.on('updated', (rates: any) => {
            for (const network of networks.data) {
              const token = __ERC20TokenList
                .current(network.netId)
                .find(token => token.symbol === rates.symbol);
              __setErc20TokenRate.current(
                network.netId,
                token?.address as string,
                rates.value,
              );
            }
            __setRate.current(rates.value);
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: tokensRates }: any = await tokenRatesService.find({
            query: { watch: 'replace' },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const resRateService: any = await ratesService.find({
            query: { source: 'coingecko.com', watch: 'replace' },
          });

          console.log('set contract data');
          for (const network of networks.data) {
            console.log(
              network.contracts.safeTransfer,
              'network.contracts.safeTransfer',
            );
            setNetworkDetails(network);
            if (network?.contracts?.safeTransfer) {
              __setSafeTransferContract.current(
                network.netId,
                network.contracts.safeTransfer,
              );
            }
            if (network?.contracts?.safeSwap) {
              __setSafeSwapContract.current(
                network.netId,
                network.contracts.safeSwap,
              );
            }
            if (network?.contracts?.staking) {
              __setStakingContract.current(
                network.netId,
                network.contracts.staking,
              );
            }
            if (network?.contracts?.kiroToken) {
              __setKiroTokenContract.current(
                network.netId,
                network.contracts.kiroToken,
              );
            }

            const erc20Service = service.getService(
              SERVICE.ERC20(network.netId),
            );
            let rate = 0;
            if (resRateService.data.length === 1) {
              rate = resRateService.data[0].value as number;
              __setRate.current(rate);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tokens = (
              ((await erc20Service.find({})) as any)
                .data as EthErc20ResponseDto[]
            ).map<ERC20TokenItem>(token => ({
              address: token.address,
              symbol: token.symbol,
              decimals: token.decimals,
              name: token.name,
              balance: '',
              rate: tokensRates.find(
                ({ symbol }: { symbol: string }) => symbol === token.symbol,
              )?.usd,
            }));

            const eth: ERC20TokenItem = {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
              balance: '',
              rate,
            };

            const kiroToken = tokens.find(token => token.symbol === 'KIRO');
            if (
              kiroToken &&
              network.netId === getChainName(__chainId.current)
            ) {
              setCurrency(eth);
              setDesiredCurrency(kiroToken);
            }

            tokens.unshift(eth);
            __setERC20TokenContract.current(network.netId, tokens);
          }
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      networkService.on('patched', (network: any) => {
        setNetworkDetails(network);
        if (network?.contracts?.safeTransfer) {
          __setSafeTransferContract.current(
            network.netId,
            network.contracts.safeTransfer,
          );
        }
        if (network?.contracts?.safeSwap) {
          __setSafeSwapContract.current(
            network.netId,
            network.contracts.safeSwap,
          );
        }
      });
    }
  }, [status]);

  useEffect(() => {
    const web3 = __web3.current;
    const chainId = __chainId.current;
    if (!web3) return;
    console.log('setSafeTransferContractWeb3', safeTransferContract?.address);
    const setSafeTransferAsync = async () => {
      if (web3 && chainId && safeTransferContract) {
        setSafeTransferContractWeb3(
          new web3.eth.Contract(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            safeTransferABI as any,
            safeTransferContract.address,
            { gas: 60000 },
          ),
        );
      }
    };
    setSafeTransferAsync();
  }, [safeTransferContract, connectCmd.is.done]);

  useEffect(() => {
    const web3 = __web3.current;
    const chainId = __chainId.current;
    if (!web3) return;
    const setSafeSwapAsync = async () => {
      if (web3 && chainId && safeSwapContract) {
        setSafeSwapContractWeb3(
          new web3.eth.Contract(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            safeSwapABI as any,
            safeSwapContract.address,
            { gas: 120000 },
          ),
        );
      }
    };
    setSafeSwapAsync();
  }, [safeSwapContract, connectCmd.is.done]);

  // on web3 connect command
  useEffect(() => {
    const web3Connect = __web3Connect.current;
    const connectCmd = __connectCmd.current;
    if (connectCmd.is.ready && !connectCmd.is.running) {
      connectCmd.start();
      web3Connect({ chainId: connectCmd.chainId as 1 | 4, privateKey: connectCmd.key })
        .then(() => {
          connectCmd.done();
        })
        .catch(e => {
          connectCmd.failed({ message: e ? JSON.stringify(e) : 'failed' });
        });
    }
  }, [connectCmd.is.ready]);

  // on web3 disconnect command
  useEffect(() => {
    const web3Disconnect = __web3Disconnect.current;
    const disconnectCmd = __disconnectCmd.current;
    const connectCmd = __connectCmd.current;
    if (disconnectCmd.is.ready && !disconnectCmd.is.running) {
      disconnectCmd.start();
      web3Disconnect();
      disconnectCmd.done();
      connectCmd.prepare({});
    }
  }, [disconnectCmd.is.ready]);

  useEffect(() => {
    const setBlock = __setBlock.current;
    setBlock(0);
  }, [web3ChainId]);

  useEffect(() => {
    const transfers = __transfers.current;
    const incoming = __incoming.current;
    const outgoing = __outgoing.current;
    const transactions = __transactions.current;
    const history = __history.current;
    const swaps = __swaps.current;
    const setActive = __setActive.current;
    const setAddress = __setAddress.current;
    const setChainId = __setChainId.current;
    const setBalance = __setBalance.current;
    const setTokenBalance = __setTokenBalance.current;
    const setStakingBalance = __setStakingBalance.current;
    const clearERC20TokenBalances = __clearERC20TokenBalances.current;
    setActive(web3Active);
    setAddress(web3Address || '');
    setChainId(web3ChainId || -1);
    setBalance('');
    setTokenBalance('');
    setStakingBalance('');
    clearERC20TokenBalances();
    transfers.clear();
    outgoing.clear();
    incoming.clear();
    transactions.clear();
    history.clear();
    exportHistory.clear();
    swaps.clear();
  }, [web3Address, web3ChainId, web3Active]);

  useEffect(() => {
    const setBlock = __setBlock.current;
    if (chainId <= 1) {
      setBlock(heightMain);
    } else if (chainId === 4) {
      setBlock(heightRinkeby);
    } else {
      setBlock(0);
    }
  }, [status, chainId, heightMain, heightRinkeby]);

  useEffect(() => {
    const service = KiroboService.getInstance();
    if (address && status) {
      const network = getChainName(chainId < 1 ? 1 : chainId);
      if (network) {
        service
          ?.getService(SERVICE.BALANCE(network))
          .find({
            query: {
              address,
              erc20: __ERC20TokenList
                .current(network)
                ?.filter(
                  item =>
                    item.address !==
                    '0x0000000000000000000000000000000000000000',
                )
                ?.map(item => item.address)
                .join(';'),
            },
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((response: any) => {
            const balance = response.data[0];
            __setBalance.current(balance?.balance || '');
            __setStakingBalance.current(balance?.stakingBalance || '');
            __setERC20TokenBalance.current(
              network,
              '0x0000000000000000000000000000000000000000',
              balance?.balance || '',
            );
            __setMaxRewards.current(balance?.maxRewards || 10);
            if (__currency.current.symbol === 'ETH') {
              __setTokenBalance.current(balance?.kiroBalance || '');
            }
            if (
              __currency.current.balance === '' &&
              __currency.current.symbol === 'ETH'
            ) {
              __setCurrencyBalance.current(balance?.balance || '');
            }
            for (const entry of Object.entries<string>(balance?.erc20 || {})) {
              __setERC20TokenBalance.current(network, entry[0], entry[1]);
              if (__currency.current.address === entry[0]) {
                __setTokenBalance.current(entry[1]);
              }
            }
          })
          .catch(reason => console.log(`error`, { reason }));

        if (
          __currency.current.symbol !== 'ETH' &&
          __safeTransferContract.current?.address &&
          __safeSwapContract.current?.address &&
          (__erc20TokenContractWeb3.current as any).currentProvider
        ) {
          const contractAddress =
            formType === 'swap'
              ? __safeSwapContract.current?.address
              : __safeTransferContract.current?.address;

          __erc20TokenContractWeb3.current.methods
            .allowance(address, contractAddress)
            .call()
            .then((allowance: string) => __setAllowance.current(allowance));
        }
        service
          ?.getService(SERVICE.REWARDS(network))
          .find({
            query: { address },
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((response: any) => {
            const rewardParams = response.data[0];
            if (rewardParams && rewardParams.address === address) {
              __setRewardsParams.current(
                rewardParams.factor,
                rewardParams.left,
              );
            } else __setRewardsParams.current(1, 10);
          })
          .catch(reason => {
            console.warn(`error: ${JSON.stringify(reason)}`);
          });
      } else {
        __setBalance.current('');
        __setTokenBalance.current('');
        __setAllowance.current('');
        __setStakingBalance.current('');
        __setRewardsParams.current(1, 10);
        __setMaxRewards.current(10);
        __clearERC20TokenBalances.current();
      }
    } else {
      __setBalance.current('');
      __setTokenBalance.current('');
      __setAllowance.current('');
      __setStakingBalance.current('');
      __setRewardsParams.current(1, 10);
      __setMaxRewards.current(10);
      __clearERC20TokenBalances.current();
    }
  }, [status, chainId, address, heightMain, heightRinkeby]);

  useEffect(() => {
    if (swapperAddress && desiredCurrency?.symbol) {
      (async function setBalance() {
        try {
          if (desiredCurrency.symbol === 'ETH') {
            const balance = await web3.eth.getBalance(swapperAddress);
            setSwapperBalance(balance);
          } else {
            const networkName = getChainName(chainId);
            const validDesiredCurrency = !!ERC20TokenList(networkName).find(
              token =>
                token.address === desiredCurrency.address &&
                token.symbol === desiredCurrency.symbol,
            );
            if (validDesiredCurrency) {
              const desiredCurrencyContract = new web3.eth.Contract(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                erc20ABI as any,
                desiredCurrency.address,
              );
              const balance = await desiredCurrencyContract.methods
                .balanceOf(swapperAddress)
                .call();
              setSwapperBalance(balance);
            }
          }
        } catch (e) {
          console.log('failed to get recipient balance', e);
        }
      })();
    } else setSwapperBalance('');
  }, [
    desiredCurrency.symbol,
    desiredCurrency.address,
    swapperAddress,
    ERC20TokenList,
    chainId,
  ]);

  useEffect(() => {
    const transfers = __transfers.current;
    const incoming = __incoming.current;
    const outgoing = __outgoing.current;
    const transactions = __transactions.current;
    const history = __history.current;
    const swaps = __swaps.current;
    const prevAddress = __prevAddress.current;
    const prevChainId = __prevChainId.current;
    const prevBlock = __prevBlock.current;
    const prevStatus = __prevStatus.current;
    const setCurrency = __setCurrency.current;
    const setDesiredCurrency = __setDesiredCurrency.current;
    const currency = __currency.current;
    const desiredCurrency = __desiredCurrency.current;

    if (!block) {
      transfers.clear();
      incoming.clear();
      outgoing.clear();
      transactions.clear();
      history.clear();
      swaps.clear();
    }

    if (status && address && block) {
      const historyItems: ITransferItem[] = [
        ...removeFromStore({
          address,
          store: incoming,
          filter: item =>
            item.confirmedBlock > 0 &&
            item.confirmedBlock <= block - MAX_CONFIRMS &&
            (item.state === 'collected' ||
              item.state === 'retrieved' ||
              item.state === 'swapped'),
        }),
        ...removeFromStore({
          address,
          store: outgoing,
          filter: item =>
            item.confirmedBlock > 0 &&
            item.confirmedBlock <= block - MAX_CONFIRMS &&
            (item.state === 'collected' ||
              item.state === 'retrieved' ||
              item.state === 'swapped'),
        }),
        ...removeFromStore({
          address,
          store: transfers,
          filter: item =>
            item.confirmedBlock > 0 &&
            item.confirmedBlock <= block - MAX_CONFIRMS &&
            (item.state === 'collected' ||
              item.state === 'retrieved' ||
              item.state === 'swapped'),
        }),
        ...removeFromStore({
          address,
          store: swaps,
          filter: item =>
            item.confirmedBlock > 0 &&
            item.confirmedBlock <= block - MAX_CONFIRMS &&
            (item.state === 'collected' ||
              item.state === 'retrieved' ||
              item.state === 'swapped'),
        }),
      ];
      for (const historyItem of historyItems) {
        moveToStore({ store: history, address, item: historyItem });
      }
    }
    if (status && address && prevChainId !== chainId) {
      const getKiroAddress = () => {
        const networkName = getChainName(chainId);
        if (networkName === 'main')
          return '0xb1191f691a355b43542bea9b8847bc73e7abb137';
        else if (networkName === 'rinkeby')
          return '0xB678E95F83aF08E7598EC21533F7585E83272799';
        else return '0x0000000000000000000000000000000000000000';
      };

      const initCurrency = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
        balance: '',
      };

      const initDesiredCurrency = {
        address: getKiroAddress(),
        symbol: 'KIRO',
        decimals: 18,
        name: 'Kiro Token',
        balance: '',
      };

      setCurrency(initCurrency);
      if (currency && currency.symbol) {
        const network = getChainName(chainId);
        const newCurrency = __ERC20TokenList
          .current(network)
          .find(token => token?.symbol === currency.symbol);
        if (newCurrency) setCurrency(newCurrency);
      }

      setDesiredCurrency(initDesiredCurrency);
      if (desiredCurrency && desiredCurrency.symbol) {
        const network = getChainName(chainId);
        const newDesiredCurrency = __ERC20TokenList
          .current(network)
          .find(token => token?.symbol === desiredCurrency.symbol);
        if (newDesiredCurrency) setDesiredCurrency(newDesiredCurrency);
      }
    }

    if (
      status &&
      address &&
      block &&
      (!prevBlock ||
        address !== prevAddress ||
        prevChainId !== chainId ||
        !prevStatus)
    ) {
      transfers.clear();
      incoming.clear();
      outgoing.clear();
      transactions.clear();
      history.clear();
      swaps.clear();

      const network = getChainName(chainId < 1 ? 1 : chainId);
      const service = KiroboService.getInstance();
      if (network && service) {
        transactions.fetch.run(40);
        transfers.fetch.run(40);
        incoming.fetch.run(40);
        outgoing.fetch.run(40);
        history.fetch.run(20);
        swaps.fetch.run(40);

        service
          ?.getService(SERVICE.TRANSFERS(network))
          .removeAllListeners('created');
        service
          ?.getService(SERVICE.TRANSFERS(network))
          .removeAllListeners('patched');
        service
          ?.getService(SERVICE.TRANSFERS(network))
          .removeAllListeners('updated');
        service
          ?.getService(SERVICE.TRANSFERS(network))
          .removeAllListeners('removed');

        service
          ?.getService(SERVICE.TRANSFERS(network))
          .on('created', (item: EthTransferResponseDto) => {
            if (!item.interchange?.value)
              putInStore({ store: __transfers.current, address, item });
            else if (item.interchange?.value)
              putInStore({ store: __swaps.current, address, item });
            if (item.from === address)
              putInStore({ store: __outgoing.current, address, item });
            else if (item.to === address)
              putInStore({ store: __incoming.current, address, item });
          });
        service
          ?.getService(SERVICE.TRANSFERS(network))
          .on('patched', (item: EthTransferResponseDto) => {
            if (
              (item.collect.confirmed > 0 &&
                item.collect.confirmed <= block - MAX_CONFIRMS) ||
              (item.retrieve.confirmed > 0 &&
                item.retrieve.confirmed <= block - MAX_CONFIRMS)
            ) {
              putInStore({ store: __history.current, address, item });
            }
            if (
              (item.collect.confirmed > 0 &&
                item.collect.confirmed <= block - MAX_CONFIRMS) ||
              (item.retrieve.confirmed > 0 &&
                item.retrieve.confirmed <= block - MAX_CONFIRMS) ||
              (item.swap &&
                item.swap.confirmed > 0 &&
                item.swap.confirmed <= block - MAX_CONFIRMS)
            ) {
              deleteFromStore({
                store: !item.interchange?.value
                  ? __transfers.current
                  : __swaps.current,
                address,
                id: item.id,
              });
            } else {
              putInStore({
                store: !item.interchange?.value
                  ? __transfers.current
                  : __swaps.current,
                address,
                item,
              });
            }

            if (
              (item.collect.confirmed > 0 &&
                item.collect.confirmed <= block - MAX_CONFIRMS) ||
              (item.retrieve.confirmed > 0 &&
                item.retrieve.confirmed <= block - MAX_CONFIRMS) ||
              (item.swap &&
                item.swap.confirmed > 0 &&
                item.swap.confirmed <= block - MAX_CONFIRMS)
            ) {
              deleteFromStore({
                store:
                  item.from === address
                    ? __outgoing.current
                    : __incoming.current,
                address,
                id: item.id,
              });
            } else {
              putInStore({
                store:
                  item.from === address
                    ? __outgoing.current
                    : __incoming.current,
                address,
                item,
              });
            }
          });

        service
          ?.getService(SERVICE.TRANSFERS(network))
          .on('removed', (item: EthTransferResponseDto) => {
            deleteFromStore({
              store: __transfers.current,
              address,
              id: item.id,
            });
            deleteFromStore({ store: __outgoing.current, address, id: item.id });
            deleteFromStore({ store: __incoming.current, address, id: item.id });
            deleteFromStore({ store: __swaps.current, address, id: item.id });
            deleteFromStore({ store: __history.current, address, id: item.id });
          });
      }
    }
  }, [status, address, chainId, block]);

  // on transfers.fetch done

  // useEffect(() => {
  //   const _history = __history.current
  //   if (history.fetched > 0 && history.fetched < 60) _history.fetch.run(40)
  // }, [history.fetched])

  // on incoming.fetch done
  useEffect(() => {
    const _incoming = __incoming.current;
    if (incoming.fetched > 0) _incoming.fetch.run(40);
  }, [incoming.fetched]);

  // on outgoing.fetch done
  useEffect(() => {
    const _outgoing = __outgoing.current;
    if (outgoing.fetched > 0) _outgoing.fetch.run(40);
  }, [outgoing.fetched]);

  useEffect(() => {
    const _transfers = __transfers.current;
    if (transfers.fetched > 0) _transfers.fetch.run(40);
  }, [transfers.fetched]);

  // on outgoing.fetch done
  useEffect(() => {
    const _swaps = __swaps.current;
    if (swaps.fetched > 0) _swaps.fetch.run(40);
  }, [swaps.fetched]);

  // on transfers.fetch command
  useEffect(() => {
    const transfers = __transfers.current;
    const block = __block.current;
    const fetchNextTransfers = __fetchNextTransfers.current;

    fetchNextTransfers({
      store: transfers,
      queryBuilder: transfersQuery,
      thresholdBlock: block - MAX_CONFIRMS,
    });
  }, [transfers.fetchCmd.is.ready]);

  type TransactionsQueryParams = {
    page: number;
    limit: number;
    startBlock?: number;
    endBlock?: number;
  };

  const getTransactionsQuery = ({
    page,
    limit,
    startBlock,
    endBlock,
  }: TransactionsQueryParams) => {
    const startblock = startBlock ? startBlock : 0;
    const endblock = endBlock
      ? endBlock
      : AMOUNT_OF_TRANSACTIONS_UPPER_THRESHOLD;
    const query = `startblock=${startblock}&endblock=${endblock}&page=${page}&offset=${limit}&sort=desc`;
    return query;
  };


  // on swaps.fetch command
  useEffect(() => {
    const swaps = __swaps.current;
    const block = __block.current;
    const fetchNextTransfers = __fetchNextTransfers.current;

    fetchNextTransfers({
      store: swaps,
      queryBuilder: swapsQuery,
      thresholdBlock: block - MAX_CONFIRMS,
    });
  }, [swaps.fetchCmd.is.ready]);

  // on history.fetch command
  useEffect(() => {
    const history = __history.current;
    const block = __block.current;
    const fetchNextTransfers = __fetchNextTransfers.current;

    const watch = history.count > 0 ? 'ignore' : 'replace';
    fetchNextTransfers({
      store: history,
      queryBuilder: historyQuery,
      thresholdBlock: block - MAX_CONFIRMS,
      watch,
    });
  }, [history.fetchCmd.is.ready]);

  // on incoming.fetch command
  useEffect(() => {
    const incoming = __incoming.current;
    const block = __block.current;
    const fetchNextTransfers = __fetchNextTransfers.current;

    fetchNextTransfers({
      store: incoming,
      queryBuilder: inboxQuery,
      thresholdBlock: block - MAX_CONFIRMS,
    });
  }, [incoming.fetchCmd.is.ready]);

  // on outgoing.fetch command
  useEffect(() => {
    const outgoing = __outgoing.current;
    const block = __block.current;
    const fetchNextTransfers = __fetchNextTransfers.current;

    fetchNextTransfers({
      store: outgoing,
      queryBuilder: outboxQuery,
      thresholdBlock: block - MAX_CONFIRMS,
    });
  }, [outgoing.fetchCmd.is.ready]);

  // on exportHistory.fetch command
  useEffect(() => {
    const exportHistory = __exportHistory.current;
    const block = __block.current;
    const fetchNextTransfers = __fetchNextTransfers.current;

    const watch = exportHistory.count > 0 ? 'ignore' : 'replace';
    if (exportHistory.fetchCmd.is.running || !exportHistory.fetchCmd.is.ready)
      return;

    try {
      if (exportHistory.name === 'history') {
        fetchNextTransfers({
          store: exportHistory,
          queryBuilder: historyQuery,
          thresholdBlock: block - MAX_CONFIRMS,
          watch,
        });
      } else {
        fetchNextTransactions({
          store: exportHistory,
          queryBuilder: getTransactionsQuery,
          endBlockTo: exportHistory.firstFetchedBlockNumber
            ? exportHistory.firstFetchedBlockNumber - 1
            : AMOUNT_OF_TRANSACTIONS_UPPER_THRESHOLD,
        });
      }
    } catch (e) {
      const error = e as { message: string; reason: string };
      exportHistory.fetchCmd.failed({ message: error.message || error.reason });
    }
  }, [exportHistory.fetchCmd.is.ready]);

  useEffect(() => {
    const exportHistory = __exportHistory.current;

    if (!exportHistory.fetchCmd.is.done) return;
    exportHistory.exportCmd.start();
    if (exportHistory.count > exportHistory.fetched) {
      exportHistory.export.run();
    } else {
      exportHistory.exportCmd.done();
    }
  }, [exportHistory.fetchCmd.is.done]);

  return <>{children}</>;
});
