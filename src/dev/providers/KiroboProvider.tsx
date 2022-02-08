import React from 'react';
import { AppContext, appStore } from '../context/app';
import { Web3Provider } from './Web3Provider';

const { accountStore, addressBookStore } = appStore;

export const KiroboProvider = ({ apiKey, children }: { apiKey: string, children: JSX.Element | JSX.Element[] | null }) => (
  <AppContext.Provider value={{ accountStore, addressBookStore }}>
    <Web3Provider apiKey={apiKey} />
    {children}
  </AppContext.Provider>
);
