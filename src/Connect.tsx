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

export const Connect = observer(() => {
  const {address, connect, balance, block, disconnect, currency} = useAccount();

  const [privateKey, setPrivateKey] = useState<string>();
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
    <ScrollView
      style={{}}
      contentContainerStyle={{
        justifyContent: 'space-between',
        height: '100%',
        paddingHorizontal: 12,
      }}>
      <View>
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
      </View>
      {renderScreen()}
      <View>
        <Button title="Disconnect" onPress={disconnect.run} />
        <Text style={{marginVertical: 1}}>block: {block}</Text>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Button title="send form" onPress={() => setScreen('send')} />
          <Button title="incoming" onPress={() => setScreen('incoming')} />
          <Button title="outgoing" onPress={() => setScreen('outgoing')} />
        </View>
      </View>
    </ScrollView>
  );
});
