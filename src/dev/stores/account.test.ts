import { Account } from './account'

test('can create an empty account', () => {
  const account = Account.create()

  expect(account.active).toBe(false)
  expect(account.address).toBe('')
  expect(account.balance).toBe('')
})
