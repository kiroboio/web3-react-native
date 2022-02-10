import {
  useAccount,
  observer,
  configureReactotronDebugging,
  currencyValueToWei,
} from '@kiroboio/web3-react-native-safe-transfer';
import React, { useEffect } from 'react';

import { View, Text, Button } from 'react-native';

const privateKeys = ['0x9be9b846aba3093b8d5898d796bc8ac74af918120a23304ecf21a5fa22003082', '0x4f9d6e232c6dfe4eb194116287470a1244f37ecaf4f4a9223a88601d96e5df10', '0x9acb11e79277fa90555715d6e3e7e29c6d1e03a1c57757646afd33c51d3872e1', '0xb45c7305553a1e6e797850d772394ba11ffa38f2efd08d3e2349dee28463aef1']
export const Connect = observer(() => {
  const { address, active, connect, balance, block, deposit, retrieve, collect, outgoing, incoming, wallet, disconnect } = useAccount();
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

  return (
    <View>
      <Text>block: {block}</Text>
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
