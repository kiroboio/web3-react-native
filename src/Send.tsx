/* eslint-disable react-native/no-inline-styles */
import {
  useAccount,
  observer,
  currencyValueToWei,
} from '@kiroboio/web3-react-native-safe-transfer';
import React, {useState} from 'react';

import {View, Text, TextInput, ScrollView, Button} from 'react-native';

export const Send = observer(() => {
  const {
    deposit,
    currency,
    setCurrency,
    ERC20TokenList,
    approvedToken,
    approve,
    safeTransferContract,
    address,
  } = useAccount();

  const [sendToAddress, setSendToAddress] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');

  const handleDeposit = () => {
    deposit.run({
      to: sendToAddress,
      value: currencyValueToWei(value, currency.decimals),
      passcode,
    });
  };

  if (!address) return null;
  if (deposit.is.running) return <Text>Running...</Text>;
  return (
    <ScrollView>
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
      {approvedToken(currency.symbol, currencyValueToWei(value, 18)) ? (
        <>
          <Button
            title="deposit"
            onPress={handleDeposit}
            disabled={!passcode}
          />
          <Text style={{color: 'red'}}>{deposit.is.withFailMessage}</Text>
        </>
      ) : (
        <>
          <Button
            disabled={approve.is.running}
            title="approve"
            onPress={() => {
              if (!safeTransferContract) return;
              approve.run(safeTransferContract?.address);
            }}
          />
          <Text style={{color: 'red'}}>{approve.is.withFailMessage}</Text>
        </>
      )}
      {ERC20TokenList('rinkeby').map(token => (
        <View style={{marginVertical: 1}}>
          <Button
            title={token.symbol}
            onPress={() => setCurrency(token)}
            key={token.address}
          />
        </View>
      ))}
    </ScrollView>
  );
});
