import {
  Connectors,
  useAccount,
  observer,
  useWallet,
  configureReactotronDebugging,
  currencyValueToWei,
} from './dev';
import React, {useEffect} from 'react';

import {View, Text, Button} from 'react-native';

export const Connect = observer(() => {
  const {address, active, wallet, connect, balance, block, deposit} =
    useAccount();
  const {setNewMnemonic} = useWallet();
  console.log({address, active, balance, block});
  useEffect(() => {
    configureReactotronDebugging();
    wallet.setMnemonic(
      'front assume robust donkey senior economy maple enhance click bright game alcohol',
    );
    setNewMnemonic(wallet.mnemonic.data);
    if (!wallet.mnemonic.data) wallet.tryRestoreMnemonicFromStorage();
    return connect.run(Connectors.InAppWallet);
  }, []);

  const handleDeposit = () => {
    console.log('click');
    deposit.run({
      to: '0x7da67A5f8d4Bd1db493cc5a484f0D00CBe282DEc',
      value: currencyValueToWei('0.0001', 18),
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
