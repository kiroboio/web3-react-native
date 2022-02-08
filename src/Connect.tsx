import {
  useAccount,
  observer,
  configureReactotronDebugging,
  currencyValueToWei,
} from './dev';
import React, { useEffect } from 'react';

import { View, Text, Button, FlatList, ListViewBase } from 'react-native';

export const Connect = observer(() => {
  const { address, active, connect, balance, block, deposit, retrieve, collect, outgoing, incoming, wallet } = useAccount();
  console.log({ address, active, balance, block });
  useEffect(() => {
    configureReactotronDebugging({});

    return connect.run({ chainId: 4, key: '0x9be9b846aba3093b8d5898d796bc8ac74af918120a23304ecf21a5fa22003082' });
  }, []);

  const handleDeposit = () => {
    deposit.run({
      to: '0x7da67A5f8d4Bd1db493cc5a484f0D00CBe282DEc',
      value: currencyValueToWei('0.00001', 18),
      passcode: '123321',
    });
  };

  const handleRetrieve = (id: string) => {
    retrieve.run({
      id,
    });
  };

  const handleCollect = (id: string) => {
    collect.run({
      id,
      passcode: '123321'
    });
  };


  if (deposit.is.running) return <Text>Running...</Text>;
  if (retrieve.is.running) return <Text>Retrieving...</Text>;
  if (collect.is.running) return <Text>Collecting...</Text>;
  return (
    <View>
      <Text>test</Text>
      <Button title="deposit" onPress={handleDeposit} />

      <Button title='add address' onPress={() => wallet.addAddressCmd.prepare()}/>
      {/* {incoming.list.map((trx) => {
        return <Button title="collect" key={trx.id} onPress={() => handleCollect(trx.id)} />
      })}
      {outgoing.list.map((trx) => {
        return <Button title="retrieve" key={trx.id} onPress={() => handleRetrieve(trx.id)} />
      })} */}

    </View>
  );
});
