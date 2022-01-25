------

##### Deposit

```typescript
import React from 'react'
import { Button } from "./Button"
import { useAccount, observer, Connectors, currencyValueToWei } from '@kiroboio/web3-react-safe-transfer'


export const DepositButton = observer(() => {
    const {
        address,
        deposit,
        swapDeposit,
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

    const handleSwapDeposit = (data: FormInputs) => {
        const { to, amount, desiredAmount, passcode, message } = data

        swapDeposit.run({
            to,
            value: currencyValueToWei(amount, currency.decimals || 18),
            desiredValue: currencyValueToWei(desiredAmount, currency.decimals || 18),
            passcode,
            message,
        })
  }
    
    return (
        <>
          <Button title="Send" onClick={handleDeposit} />
          <Button title="Swap" onClick={handleSwapDeposit} />
        </>
})
```
- *<a href="/docs/api/stores/interfaces/IAccount#deposit">IDeposit</a>*
- *<a href="/docs/api/stores/interfaces/IAccount#swapdeposit">ISwapDeposit</a>*

##### Status

```typescript
const {
    deposit,
    swapDeposit,
  } = useAccount()
```

- *<a href="/docs/api/stores/interfaces/ICmdStatus">deposit.is</a>*
- *<a href="/docs/api/stores/interfaces/ICmdStatus">swapDeposit.is</a>*
