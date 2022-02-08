import {
  useAccount,
  observer,
  configureReactotronDebugging,
  currencyValueToWei,
} from './dev';
import React, { useEffect } from 'react';

import { View, Text, Button } from 'react-native';

const privateKeys = ['']
export const Connect = observer(() => {
  const { address, active, connect, balance, block, deposit, retrieve, collect, outgoing, incoming, wallet, disconnect } = useAccount();
  console.log({ address, active, balance, block });
  useEffect(() => {
    configureReactotronDebugging({});

  }, []);

  const handleConnect = ({ key }: { key: string }) => connect.run({ chainId: 4, key });
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

  const handleChangeAccount = (address: string) => {
    wallet.setActiveAccount(address);
  }


  if (deposit.is.running) return <Text>Running...</Text>;
  if (retrieve.is.running) return <Text>Retrieving...</Text>;
  if (collect.is.running) return <Text>Collecting...</Text>;

  console.log({ accounts: wallet.accounts })
  return (
    <View>
      <Text>address: {address}</Text>
      <Text>balance: {balance}</Text>
      <Button title="deposit" onPress={handleDeposit} />

      <Button title='add address' onPress={() => wallet.addAddressCmd.prepare()} />
      {privateKeys.map((key) => {
        return <Button title={key} key={key} onPress={() => handleConnect({ key })} />
      })}
      <Button title="Disconnect" onPress={disconnect.run} />
      {/* {incoming.list.map((trx) => {
        return <Button title="collect" key={trx.id} onPress={() => handleCollect(trx.id)} />
      })}
      {outgoing.list.map((trx) => {
        return <Button title="retrieve" key={trx.id} onPress={() => handleRetrieve(trx.id)} />
      })} */}
    </View>
  );
});
