### Debugging

For view `Safe Transfer` state & actions install and configure [Reactotron](https://github.com/infinitered/reactotron)



------

*Configure reactotron on app component did mount*

```typescript
import React, { useEffect } from 'react'
import { configureReactotronDebugging, useAccount, observer, Connectors  } from '@kiroboio/web3-react-safe-transfer'
import { Wallet } from "./Wallet"


export const App = observer(() => {
  const {
    connect,
  } = useAccount()
  
  const handleLogin = () => {
      connect(Connectors.Injected)
  }
  
  useEffect(() => {
      configureReactotronDebugging()
  }, [])
    
  return <Wallet onLogin={handleLogin} />
})
```

