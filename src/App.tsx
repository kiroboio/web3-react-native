import React from 'react';
import { KiroboProvider } from './dev/providers/KiroboProvider';
import { Connect } from './Connect';
import { INFURA_KEY, API_KEY, API_SECRET } from "react-native-dotenv"

export const App = () => {
  return (
    <KiroboProvider
      infuraKey={INFURA_KEY}
      apiKey={API_KEY}
      apiSecret={API_SECRET}>
      <Connect />
    </KiroboProvider>
  );
};
