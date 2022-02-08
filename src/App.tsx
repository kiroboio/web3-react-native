import React from 'react';
import {View, Text} from 'react-native';
import {KiroboProvider} from './dev/providers/KiroboProvider';
import {Connect} from './Connect';

export const App = () => {
  return (
    <KiroboProvider apiKey='14c73ecdbcaa464585aa7c438fdf6a77'>
      <View>
        <Text>test</Text>
        <Connect />
      </View>
    </KiroboProvider>
  );
};
