/* eslint-disable react-native/no-inline-styles */
import {
  useAccount,
  observer,
  weiToCurrencyValue,
} from '@kiroboio/web3-react-native-safe-transfer';
import React, {useState} from 'react';

import {View, Text, Button, TextInput, ScrollView} from 'react-native';
import {Incoming} from './Incoming';
import {Outgoing} from './Outgoing';
import {Send} from './Send';

// const privateKeys = [
//   'e843091ef8dcf8b32a505e81770029a7d3044cbcaf9745b27b1dd494f614ebd7',
//   'bdaaeb35c3c67c87e2c7cb1e49467cbad04a1c5f815ba4b635db0e11fe6e789b',
// ];
// const sendTo = ["0x7da67A5f8d4Bd1db493cc5a484f0D00CBe282DEc"]
export const Connect = observer(() => {
  const {address, connect, balance, block, disconnect, currency} = useAccount();

  const [privateKey, setPrivateKey] = useState<string>(
    'e843091ef8dcf8b32a505e81770029a7d3044cbcaf9745b27b1dd494f614ebd7',
  );
  const [screen, setScreen] = useState<'send' | 'incoming' | 'outgoing'>(
    'send',
  );

  const handleConnect = () => connect.run({chainId: 4, key: privateKey});

  const renderScreen = () => {
    switch (screen) {
      case 'send':
        return <Send />;
      case 'incoming':
        return <Incoming />;
      case 'outgoing':
        return <Outgoing />;
    }
  };
  return (
    <ScrollView style={{paddingHorizontal: 24}}>
      <Text>address: {address}</Text>
      <Text>balance: {weiToCurrencyValue(balance, 18)}</Text>
      <Text>currency: {currency.symbol}</Text>
      <Text>
        currency balance:
        {weiToCurrencyValue(currency.balance, currency.decimals)}
      </Text>
      <TextInput
        placeholder="private key"
        onChange={e => setPrivateKey(e.nativeEvent.text)}
        value={privateKey}
      />
      <Button title="connect" onPress={handleConnect} />

      {renderScreen()}
      <Button title="Disconnect" onPress={disconnect.run} />
      <Text>block: {block}</Text>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <Button title="send" onPress={() => setScreen('send')} />
        <Button title="incoming" onPress={() => setScreen('incoming')} />
        <Button title="outgoing" onPress={() => setScreen('outgoing')} />
      </View>
    </ScrollView>
  );
});
