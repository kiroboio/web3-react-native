

#### Connect

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

<a href="/docs/api/stores/interfaces/IAccount">Account Store</a>

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

<a href="/docs/api/stores/interfaces/IAccount#connect">IConnect</a>

------

*Wallet Information*

```typescript
import React from 'react'
import { Wallet } from "./Wallet"
import { useAccount, observer } from '@kiroboio/web3-react-safe-transfer/lib'

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

