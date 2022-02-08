import React from 'react';
import { Web3ProviderUpdater } from './Web3ProviderUpdater';

export const Web3Provider = ({ apiKey }: { apiKey: string }) => {
  return <Web3ProviderUpdater apiKey={apiKey} />

};
