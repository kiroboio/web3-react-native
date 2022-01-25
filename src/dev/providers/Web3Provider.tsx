import React from 'react';
import {Web3ReactProvider} from '@web3-react/core';
import {AbstractConnector} from '@web3-react/abstract-connector';
import Web3 from 'web3';
import {Web3ProviderUpdater} from './Web3ProviderUpdater';
import {IInAppWalletConnector} from '../customConnectors/InAppWalletConnector';
import {Connectors} from '..';

const getLibrary = (
  provider: any,
  connector?: AbstractConnector | IInAppWalletConnector,
) => {
  console.log({connector});
  if (connector) {
    const appConnector = connector as IInAppWalletConnector;
    if (appConnector.name === Connectors.InAppWallet) {
      const web3 = appConnector.web3;
      console.log({web3}, 'getLibrary');
      return web3;
    }
  }
  return new Web3(provider);
};

export const Web3Provider: React.FC = () => {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3ProviderUpdater />
    </Web3ReactProvider>
  );
};
