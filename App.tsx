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
import expandGlobal from './expandGlobal';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {App as SrcApp} from './src/App';

expandGlobal();
const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  console.log({ global })
  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SrcApp />
    </SafeAreaView>
  );
};

export default App;
