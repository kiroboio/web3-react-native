import React from 'react';
import { AppContext, appStore } from '../context/app';
import { Web3Provider } from './Web3Provider';

const { accountStore } = appStore;

export type ProviderProps = { infuraKey: string, apiKey: string, apiSecret: string }
export const KiroboProvider = ({ apiKey, apiSecret, infuraKey, children }:  ProviderProps & { children: JSX.Element | JSX.Element[] | null }) => (
  <AppContext.Provider value={{ accountStore }}>
    <Web3Provider apiKey={apiKey} apiSecret={apiSecret} infuraKey={infuraKey} />
    {children}
  </AppContext.Provider>
);
