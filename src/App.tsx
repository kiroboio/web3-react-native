import React from 'react';
import { View, Text } from 'react-native';
import { KiroboProvider } from './dev/providers/KiroboProvider';
import { Connect } from './Connect';

export const App = () => {
  return (
    <KiroboProvider
      infuraKey='14c73ecdbcaa464585aa7c438fdf6a77'
      apiKey='YXVkIjoiaHR0cHM6Ly9hcGkua2lyb2JvLm1'
      apiSecret='Ijoia2lyb2JvIiwic3ViIjoiNWU2MTNiNmVlYzgzMWQx'>
      <View>
        <Text>test</Text>
        <Connect />
      </View>
    </KiroboProvider>
  );
};
