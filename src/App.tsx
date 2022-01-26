import React from 'react';
import {View, Text} from 'react-native';
import {KiroboProvider} from './dev/providers/KiroboProvider';
import {Connect} from './Connect';

export const App = () => {
  return (
    <KiroboProvider>
      <View>
        <Text>test</Text>
        <Connect />
      </View>
    </KiroboProvider>
  );
};
