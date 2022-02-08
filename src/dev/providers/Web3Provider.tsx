import React from 'react';
import { ProviderProps } from './KiroboProvider';
import { Web3ProviderUpdater } from './Web3ProviderUpdater';

export const Web3Provider = (props: ProviderProps) => {
  return <Web3ProviderUpdater {...props} />

};
