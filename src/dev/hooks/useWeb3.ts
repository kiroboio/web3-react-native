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
  active: boolean;
  chainId?: number;
  address?: null | string;
}

export const useWeb3 = ({ infuraKey }: { infuraKey: string }): IWeb3ReactContext => {
  const [address, setAddress] = useState<string | undefined>();
  const [active, setActive] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number>(-1);
  const [library, setLibrary] = useState<Web3>(new Web3());

  const RPC_URLS: { [chainId: number]: string } = {
    1: `https://mainnet.infura.io/v3/${infuraKey}`,
    4: `https://rinkeby.infura.io/v3/${infuraKey}`,
  };

  const connect = async ({ chainId, privateKey }: {
    chainId: 1 | 4,
    privateKey: string,
  }) => {
    new InAppWalletConnector({
      url: RPC_URLS[chainId],
      privateKey,
      chainId
    });

    const { web3, address } = InAppWalletConnector;
    setChainId(chainId);
    setAddress(address);
    setLibrary(web3);
    if (address) {
      setActive(true);
    }
  };

  const disconnect = () => {
    setChainId(-1);
    setAddress('');
    setLibrary(new Web3());
    setActive(false)
  };

  return {
    connect,
    disconnect,
    address,
    active,
    chainId,
    library,
    connector: InAppWalletConnector,
  };
};

