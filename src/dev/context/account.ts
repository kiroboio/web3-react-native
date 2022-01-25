import React, { useContext } from 'react'
import { IAccount, accountStore } from '../stores/account'




export const useAccount = () => {
  return useContext(React.createContext(accountStore))
}

export { IAccount }