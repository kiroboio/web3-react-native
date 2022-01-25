
#### Utils

##### Helpers for convert & format currency values

- *<a href="/docs/api/utils/modules#currencyvaluetowei">Currency Value To Wei</a>*
- *<a href="/docs/api/utils/modules#weitocurrencyvalue">Wei To Currency Value</a>*
- *<a href="/docs/api/utils/modules#formatcurrencyvalue">Format Currency Value</a>*

##### Form validators

```typescript
   import { yup } from '@kiroboio/web3-react-safe-transfer'
   import { useForm } from 'react-hook-form'
   import { yupResolver } from '@hookform/resolvers/yup'
   import { useTranslation } from 'react-i18next'
   
   const { object, string  } = yup;
   const { t } = useTranslation();

   const Form = observer(() => {
        const validationSchema = object().shape({
            to: string()
                .trim()
                .required(t('required'))
                .ethereumAddress(t('validEthereumAddressErr'))
                .test('address-differ', t('sendToYourselfErr'), function (value) {
                    return address !== value
                }),
            amount: string()
                .required(t('required'))
                .ether('1', t('positiveErr'), t('notEnough')),
                ...(formType === 'swap' && {
                desiredAmount: yupString()
                    .required(t('required'))
                    .desiredCurrency('1', t('positiveErr')),
                }),
            passcode: string()
                .trim()
                .required(t('required'))
                .min(6, t('minLengthErr', { length: 6 }))
                .max(20, t('maxLengthErr', { length: 20 })),
                message: string().trim().max(50),
        })

          const {<br />
            control,
            handleSubmit,
            reset,
            getValues,
            setValue,
            errors,
            clearErrors,
        } = useForm<FormInputs>({
                mode: 'onSubmit',
                defaultValues: {
                to: '',
                amount: '',
                passcode: '',
                token: currency,
                desiredToken: desiredCurrency,
                desiredAmount: '',
                message: '',
                },
            resolver: yupResolver(validationSchema),
        })


    return (
        <form  onSubmit={handleSubmit}>
            <Input<FormInputs>
                name="to"
                control={control}
                error={errors.to}
            />
            <Input<FormInputs>
                name="amount"
                control={control}
                error={errors.amount}
            />
            <Input<FormInputs>
                name="passcode"
                control={control}
                error={errors.passcode}
            />
            <button type="submit" onClick={handleSubmit}>Submit</button>
        </form>
      );
   })
   
```