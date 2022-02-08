import React from 'react';
import { KiroboProvider } from './dev/providers/KiroboProvider';
import { Connect } from './Connect';

export const App = () => {
  return (
    <KiroboProvider
      infuraKey=''
      apiKey=''
      apiSecret=''>
      <Connect />
    </KiroboProvider>
  );
};
