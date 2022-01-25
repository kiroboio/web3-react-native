import React from 'react';
import {View, Text} from 'react-native';
import {KiroboProvider} from './dev/providers/KiroboProvider';
import {Connect} from './Connect';

export const App = () => {
  // useEffect(() => {
  //   const authDetails = {
  //     key: 'YXVkIjoiaHR0cHM6Ly9hcGkua2lyb2JvLm1',
  //     secret: 'Ijoia2lyb2JvIiwic3ViIjoiNWU2MTNiNmVlYzgzMWQx',
  //   };

  //   serviceStore.createInstance({
  //     key: authDetails.key,
  //     secret: authDetails.secret,
  //     callback: () => {},
  //   });

  //   console.log({serviceInstance: serviceStore.instance});
  //   return () => {
  //     serviceStore.createInstance({key: '', secret: ''});
  //   };
  // }, []);

  return (
    <KiroboProvider>
      <View>
        <Text>test</Text>
        <Connect />
      </View>
    </KiroboProvider>
  );
};
