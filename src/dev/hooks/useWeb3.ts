import { InAppWalletConnector } from '../customConnectors/InAppWalletConnector';
import Web3 from 'web3';
import { useState } from 'react';

export enum Connectors {
  InAppWallet = 'InAppWallet',
}

export interface IConnectParams {
  readonly supportedChainIds?: number[];
}

export interface IWeb3ReactContext {
  library: Web3;
  connect: (p: {
    chainId: 1 | 4,
    privateKey: string,
  }) => Promise<void>;
  disconnect: () => void;
  connector: InAppWalletConnector | undefined;
  changeActiveAccount: (address: string) => void;
  active: boolean;
  chainId?: number;
  address?: null | string;
}

export const useWeb3 = (): IWeb3ReactContext => {
  const [account, setAccount] = useState<string | undefined>();
  const [active, setActive] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number>(-1);
  const [library, setLibrary] = useState<Web3>(new Web3());
  const [connector, setConnector] = useState<InAppWalletConnector>();

  const RPC_URLS: { [chainId: number]: string } = {
    1: `https://mainnet.infura.io/v3/14c73ecdbcaa464585aa7c438fdf6a77`,
    4: `https://rinkeby.infura.io/v3/14c73ecdbcaa464585aa7c438fdf6a77`,
  };

  const connect = async ({ chainId, privateKey }: {
    chainId: 1 | 4,
    privateKey: string,
  }) => {
    console.log("connect in app")
    const connector = new InAppWalletConnector({
      url: RPC_URLS[chainId],
      privateKey,
      chainId
    });

    const { web3, addresses } = connector;
    const address = Array.from(addresses)[0];
    setChainId(chainId);
    setAccount(address);
    setLibrary(web3);
    setConnector(connector);
    if (address) {
      setActive(true);
    }
  };

  const changeActiveAccount = (address: string) => {
    if(!connector?.addresses.includes(address)) return;
    InAppWalletConnector.setActiveAccount(address);
    setAccount(address);
  }

  const disconnect = () => {
    setChainId(-1);
    setAccount('');
    setLibrary(new Web3());
    setConnector(undefined);
    setActive(false)
  };

  return {
    connect,
    disconnect,
    address: account,
    active,
    chainId,
    library,
    connector,
    changeActiveAccount
  };
};

