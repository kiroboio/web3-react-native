import {
  Connectors,
  useAccount,
  observer,
  configureReactotronDebugging,
  currencyValueToWei,
} from './dev';
import React, { useEffect } from 'react';

import { View, Text, Button } from 'react-native';

export const Connect = observer(() => {
  const { address, active, connect, balance, block, deposit } = useAccount();
  console.log({ address, active, balance, block });
  useEffect(() => {
    configureReactotronDebugging({});

    return connect.run(Connectors.InAppWallet);
  }, []);

  const handleDeposit = () => {
    deposit.run({
      to: '0x7da67A5f8d4Bd1db493cc5a484f0D00CBe282DEc',
      value: currencyValueToWei('0.00001', 18),
      passcode: '123321',
    });
  };

  if (deposit.is.running) return <Text>Running...</Text>;
  return (
    <View>
      <Text>test</Text>
      <Button title="deposit" onPress={handleDeposit} />
    </View>
  );
});
