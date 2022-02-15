/* eslint-disable react-native/no-inline-styles */
import {
  useAccount,
  observer,
  currencyValueToWei,
  weiToCurrencyValue,
} from '@kiroboio/web3-react-native-safe-transfer';
import React, {useState} from 'react';

import {View, Text, Button, TextInput, ScrollView} from 'react-native';

// const privateKeys = [
//   'e843091ef8dcf8b32a505e81770029a7d3044cbcaf9745b27b1dd494f614ebd7',
//   'bdaaeb35c3c67c87e2c7cb1e49467cbad04a1c5f815ba4b635db0e11fe6e789b',
// ];
// const sendTo = ["0x7da67A5f8d4Bd1db493cc5a484f0D00CBe282DEc"]
export const Connect = observer(() => {
  const {
    address,
    connect,
    balance,
    block,
    deposit,
    disconnect,
    currency,
    setCurrency,
    ERC20TokenList,
  } = useAccount();

  const [privateKey, setPrivateKey] = useState<string>(
    'e843091ef8dcf8b32a505e81770029a7d3044cbcaf9745b27b1dd494f614ebd7',
  );
  const [sendToAddress, setSendToAddress] = useState<string>(
    '0x7da67A5f8d4Bd1db493cc5a484f0D00CBe282DEc',
  );
  const [value, setValue] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');

  const handleConnect = () => connect.run({chainId: 4, key: privateKey});
  const handleDeposit = () => {
    deposit.run({
      to: sendToAddress,
      value: currencyValueToWei(value, currency.decimals),
      passcode,
    });
  };

  if (deposit.is.running) return <Text>Running...</Text>;
  return (
    <ScrollView
      style={{paddingHorizontal: 24, paddingTop: 12, paddingBottom: 64}}>
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
      <TextInput
        placeholder="send to"
        onChange={e => setSendToAddress(e.nativeEvent.text)}
        value={sendToAddress}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <TextInput
          placeholder="amount"
          onChange={e => setValue(e.nativeEvent.text)}
          value={value}
        />
        <Text>{currency.symbol}</Text>
      </View>
      <TextInput
        placeholder="passcode"
        onChange={e => setPasscode(e.nativeEvent.text)}
        value={passcode}
      />
      <Button title="deposit" onPress={handleDeposit} />
      {ERC20TokenList('rinkeby').map(token => (
        <Button title={token.symbol} onPress={() => setCurrency(token)} />
      ))}
      <Button title="Disconnect" onPress={disconnect.run} />
      <Text>block: {block}</Text>
    </ScrollView>
  );
});
