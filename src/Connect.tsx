import {useAccount} from './dev';
import React from 'react';

import {View, Text} from 'react-native';

export const Connect = () => {
  const {address, active} = useAccount();
  console.log({address, active});
  return (
    <View>
      <Text>test</Text>
    </View>
  );
};
