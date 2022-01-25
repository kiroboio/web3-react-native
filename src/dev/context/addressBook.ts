import React, { useContext } from 'react'
import { addressBookStore } from '../stores/addressBook'
import { appStore } from "./app"

export const useAddressBook = (): typeof addressBookStore => {
  return useContext(React.createContext(appStore.addressBookStore))
}

