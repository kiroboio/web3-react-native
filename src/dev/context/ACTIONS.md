
#### Transfer Actions

##### Retrieving
```typescript
export const List = observer(() => {
  const {
    retrieve,
    swapRetrieve,
    outgoing,
    swaps,
  } = useAccount()

  const handleRetrieve = (transfer: ITransfer) => {
      retrieve.run({ id: transfer.id })
  }

  const handleSwapRetrieve = (transfer: ITransfer) => {
      swapRetrieve.run({ id: transfer.id })
  }
  return (
    <div>
        <Outgoing 
          transfers={outgoing.list.map((transfer: ITransfer) => <Transfer transfer={transfer} onRetrieve={handleRetrieve} /> )} 
        />
        <Swaps 
          transfers={swaps.list.map((transfer: ITransfer) => <Transfer transfer={transfer} onRetrieve={handleSwapRetrieve} />)}
        />
    </div>
}
```

- *<a href="/docs/api/stores/interfaces/ILists">ILists</a>*
- *<a href="/docs/api/stores/interfaces/ITransfer">ITransfer</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#retrieve">IRetrieve</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#swapretrieve">ISwapRetrieve</a>*

##### Collecting
```typescript
export const List = observer(() => {
  const {
    collect,
    swap,
    incoming,
  } = useAccount()

  const handleCollect = (transfer: ITransfer, passcode: string) => {
      if(transfer.swap?) {
        return swap.run({ id: transfer.id, passcode })
      }
      return collect.run({ id: transfer.id, passcode })
  }

  return <Incoming transfers={incoming.list.map((transfer: ITransfer) => <Transfer transfer={transfer} onCollect={handleCollect} />} />
   
}
```

- *<a href="/docs/api/stores/interfaces/IAccount#collect">ICollect</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#swap">ISwap</a>*

##### Monitoring
```typescript
export const Statuses = observer(() => {
  const {
    collect,
    swap,
    retrieve,
    swapRetrieve,
  } = useAccount()

  return (
    <> 
      <Collect isRunning={collect.is.running} />
      <Swap isRunning={swap.is.running} />
    </>
   
}
```

- *<a href="/docs/api/stores/interfaces/IAccount#connect">IConnect</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#disconnect">IDisconnect</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#collect">ICollect</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#deposit">IDeposit</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#retrieve">IRetrieve</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#swap">ISwap</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#swapdeposit">ISwapDeposit</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#swapretrieve">ISwapRetrieve</a>*