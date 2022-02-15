import {observer, useAccount} from '@kiroboio/web3-react-native-safe-transfer';
import React from 'react';
import {Button, ScrollView, View, Text} from 'react-native';

export const Outgoing = observer(() => {
  const {outgoing, retrieve} = useAccount();
  return (
    <View>
      <Text style={{color: 'red'}}>{retrieve.is.withFailMessage}</Text>
      <ScrollView>
        {outgoing.list.map(trx => (
          <Button
            disabled={
              trx.state === 'retrieved' ||
              trx.state === 'retrieving' ||
              trx.state === 'collected'
            }
            title={`undo ${trx.value} ${trx.token.symbol || 'ETH'} ${
              trx.state
            }`}
            onPress={() => retrieve.run({id: trx.id})}
          />
        ))}
      </ScrollView>
    </View>
  );
});
