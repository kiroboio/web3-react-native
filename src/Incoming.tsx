import {observer, useAccount} from '@kiroboio/web3-react-native-safe-transfer';
import React, {useState} from 'react';
import {Button, ScrollView, Text, View, TextInput} from 'react-native';

export const Incoming = observer(() => {
  const {incoming, collect} = useAccount();
  const [passcode, setPasscode] = useState<string | undefined>();
  const [activeCollectId, setActiveCollectId] = useState<string | undefined>();
  return (
    <View>
      <Text style={{color: 'red'}}>{collect.is.withFailMessage}</Text>
      <ScrollView>
        {incoming.list.map(trx => {
          if (trx.id === activeCollectId) {
            return (
              <View>
                <TextInput
                  placeholder="passcode"
                  value={passcode}
                  onChange={e => setPasscode(e.nativeEvent.text)}
                />
                <Button
                  disabled={!passcode}
                  title={`collect ${trx.value} ${trx.token.symbol || 'ETH'} ${
                    trx.state
                  }`}
                  onPress={() => {
                    if (!passcode) return;
                    setActiveCollectId(undefined);
                    collect.run({id: trx.id, passcode});
                  }}
                />
              </View>
            );
          }
          return (
            <Button
              disabled={
                trx.state === 'collected' ||
                trx.state === 'collecting' ||
                trx.state === 'retrieved'
              }
              title={`collect ${trx.value} ${trx.token.symbol || 'ETH'} ${
                trx.state
              }`}
              onPress={() => {
                setActiveCollectId(trx.id);
                //collect.run({id: trx.id, passcode: '123321'});
              }}
            />
          );
        })}
      </ScrollView>
    </View>
  );
});
