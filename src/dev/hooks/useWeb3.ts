import { InAppWalletConnector } from '../customConnectors/InAppWalletConnector';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';
import Web3 from 'web3';
import { useState } from 'react';

export enum Connectors {
  InAppWallet = 'InAppWallet',
}

export interface IConnectParams {
  readonly supportedChainIds?: number[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConnectorType = Required<Web3ReactContextInterface>['connector'] & {
  addWalletAddress?: () => void;
  removeWalletAddress?: (a: string) => void;
  handleAccountChanged?: (a: string) => void;
};

export interface IWeb3ReactContext {
  connect: (p: {
    chainId: 1 | 4,
    privateKey: string,
  }) => Promise<void>;
  disconnect: () => void;
  library: Web3;
  chainId?: number;
  address?: null | string;
  active: boolean;
}

export const useWeb3 = (): IWeb3ReactContext => {
  const [account, setAccount] = useState<string | undefined>();
  const [active, setActive] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number>(-1);
  const [library, setLibrary] = useState<Web3>(new Web3());

  const RPC_URLS: { [chainId: number]: string } = {
    1: `https://mainnet.infura.io/v3/14c73ecdbcaa464585aa7c438fdf6a77`,
    4: `https://rinkeby.infura.io/v3/14c73ecdbcaa464585aa7c438fdf6a77`,
  };

  interface ConnectorNode {
    connector: ConnectorType;
  }

  const connectors: ConnectorNode[] = [];

  const connect = async ({ chainId, privateKey }: {
    chainId: 1 | 4,
    privateKey: string,
  }) => {
    const { web3, addresses } = InAppWalletConnector.getWeb3({
      url: RPC_URLS[chainId],
      privateKey,
    });

    const address = Array.from(addresses)[0];
    setChainId(chainId);
    setAccount(address);
    setLibrary(web3);
    if (address) {
      setActive(true);
    }
  };

  const disconnect = () => {
    delete connectors[0];
  };

  return {
    connect,
    disconnect,
    address: account,
    active,
    chainId,
    library,
  };
};

