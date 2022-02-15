/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-communit>y/react-native-template-typescript
 *
 * @format
 */
import React from 'react';
import {SafeAreaView, StatusBar, useColorScheme} from 'react-native';
import './shim';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {KiroboProvider} from '@kiroboio/web3-react-native-safe-transfer';
import {Connect} from './src/Connect';
import {INFURA_KEY, API_KEY, API_SECRET} from 'react-native-dotenv';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <KiroboProvider
        infuraKey={INFURA_KEY}
        apiKey={API_KEY}
        apiSecret={API_SECRET}>
        <Connect />
      </KiroboProvider>
    </SafeAreaView>
  );
};

export default App;
