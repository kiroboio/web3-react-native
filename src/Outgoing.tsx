import {observer, useAccount} from '@kiroboio/web3-react-native-safe-transfer';
import React from 'react';
import {Button, ScrollView} from 'react-native';

export const Outgoing = observer(() => {
  const {outgoing, retrieve} = useAccount();
  return (
    <ScrollView>
      {outgoing.list.map(trx => (
        <Button
          key={trx.id}
          disabled={
            trx.state === 'retrieved' ||
            trx.state === 'retrieving' ||
            trx.state === 'collected'
          }
          title={`undo ${trx.value} ${trx.token.symbol || 'ETH'} ${trx.state}`}
          onPress={() => retrieve.run({id: trx.id})}
        />
      ))}
    </ScrollView>
  );
});
