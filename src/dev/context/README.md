

### Context

#### Kirobo Provider

`KiroboProvider`  wrap all children with `AccountContext` and implement all actions related to `web3` like `deposit` ,`retrieve`, `collect`, `swap` transaction after invoking appropriate action from `AccountProvider`

#### Use Account

*<a href="/docs/Api/stores/interfaces/IAccount">Account Store Interface</a>*

To use `account` store wrap application `components` with `KiroboProvider` context


------

*KiroboProvider Application Wrapper*

```typescript
import { KiroboProvider } from './kirobo'

ReactDOM.render(
  <KiroboProvider>
    <App />
  </KiroboProvider>,
  document.getElementById('root')
)

```


Account store use `mobx-state-tree` lib for  [reactive state management ](https://mobx-state-tree.js.org/intro/welcome). To re-render react component on account state change use [observer](https://mobx-state-tree.js.org/intro/getting-started#getting-to-the-ui)

*Each `observer` declaration will enable the React component to only re-render if any of it's observed data changes.*


------

*Connect with metamask*

```typescript
export const App = observer(() => {
  const {
    connect,
  } = useAccount()
  
  const handleLogin = () => {
      connect(Connectors.Injected)
  }
  
  return <Wallet onLogin={handleLogin} />
})
```

------

*Account Store States*

```typescript
import React from 'react'
import { Wallet } from "./Wallet"
import { useAccount, observer } from '@kiroboio/web3-react-safe-transfer'

export const Wallet = observer(() => {
  const {
    address,
    balance,
  } = useAccount()
    
  return (
      <div className="wallet">
      	address: { address }
        balance: { balance }                 
      </div>
   	)
})
```


------

*Account Store States & Deposit Action*

```typescript
import React from 'react'
import { Button } from "./Button"
import { useAccount, observer, Connectors, currencyValueToWei } from '@kiroboio/web3-react-safe-transfer'


export const DepositButton = observer(() => {
    const {
        address,
        deposit,
        currency,
    } = useAccount()

    const handleDeposit = ({
            to,
            value,
            passcode,
            message,
        }: DepositParams) => {

        deposit.run({
            to,
            value: currencyValueToWei(value, currency.decimals),
            passcode,
            message,
        })
    }
    
    return <Button title="Send" onClick={handleDeposit} />
})
```

