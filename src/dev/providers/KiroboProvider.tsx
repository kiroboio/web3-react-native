import React from 'react';
import {AppContext, appStore} from '../context/app';
import {Web3Provider} from './Web3Provider';

const {accountStore, addressBookStore} = appStore;

export const KiroboProvider: React.FC = props => (
  <AppContext.Provider value={{accountStore, addressBookStore}}>
    <Web3Provider />
    {props.children}
  </AppContext.Provider>
);
