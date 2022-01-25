import {
  Connectors,
  useAccount,
  observer,
  useWallet,
  configureReactotronDebugging,
} from './dev';
import React, {useEffect} from 'react';

import {View, Text} from 'react-native';

export const Connect = observer(() => {
  const {address, active, wallet, connect, balance, block, deposit } = useAccount();
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

  return (
    <View>
      <Text>test</Text>
    </View>
  );
});
