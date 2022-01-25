import {useMoralis, AuthError, useMoralisWeb3Api} from 'react-moralis';
import {Moralis} from 'moralis';
import WalletConnectProvider from '@walletconnect/ethereum-provider';

export enum Connectors {
  InAppWallet = 'InAppWallet',
  Injected = 'Injected',
  WalletConnect = 'WalletConnect',
  WalletLink = 'WalletLink',
  MyEtherWallet = 'MyEtherWallet',
}

export interface IConnectParams {
  readonly supportedChainIds?: number[];
}

export type MoralisChainIdType =
  | 'eth'
  | '0x1'
  | 'ropsten'
  | '0x3'
  | 'rinkeby'
  | '0x4'
  | 'goerli'
  | '0x5'
  | 'kovan'
  | '0x2a'
  | 'polygon'
  | '0x89'
  | 'mumbai'
  | '0x13881'
  | 'bsc'
  | '0x38'
  | 'bsc testnet'
  | '0x61'
  | 'avalanche'
  | '0xa86a'
  | 'avalanche testnet'
  | '0xa869'
  | 'fantom'
  | '0xfa'
  | undefined;

export interface IWeb3ReactContext<T> {
  Moralis: typeof Moralis;
  web3Api: ReturnType<typeof useMoralisWeb3Api>;
  library: T | null;
  isLoading: boolean;
  active: boolean;
  moralisChainId: MoralisChainIdType;
  connect: (
    connectorName: Connectors,
    params?: IConnectParams,
  ) => Promise<void>;
  disconnect: () => void;
  error: AuthError | null;
  chainId?: number;
  address?: null | string;
  isAuthenticated: boolean;
}

export const useWeb3 = (): IWeb3ReactContext<Moralis['Web3']> => {
  const {
    web3,
    enableWeb3,
    account,
    isAuthenticated,
    chainId,
    authenticate,
    isWeb3EnableLoading,
    authError,
    logout,
    Moralis,
  } = useMoralis();

  const web3Api = useMoralisWeb3Api();
  const connect = async (connectorName: Connectors) => {
    const provider =
      connectorName === 'WalletConnect' ? 'walletconnect' : undefined;

    if (!isAuthenticated) {
      const message = 'Liquid Vault Login';
      await authenticate({provider, signingMessage: message});
    }
    if (!isWeb3EnableLoading) {
      enableWeb3({
        provider,
        onError: e => console.error('web3 connect error', e),
      });
    }
  };

  const disconnect = () => {
    logout();
  };

  const getCurrentAccount = () => {
    const provider = web3?.provider as unknown as
      | WalletConnectProvider
      | string
      | null;
    if (provider && typeof provider !== 'string' && provider?.accounts) {
      const walletConnectProvider = provider as WalletConnectProvider;
      return walletConnectProvider.accounts[0];
    }
    return account;
  };

  return {
    Moralis,
    connect,
    disconnect,
    address: getCurrentAccount(),
    active: isAuthenticated,
    chainId: Number(chainId),
    moralisChainId: chainId as MoralisChainIdType,
    error: authError,
    library: web3,
    isLoading: isWeb3EnableLoading,
    web3Api,
    isAuthenticated,
  };
};
