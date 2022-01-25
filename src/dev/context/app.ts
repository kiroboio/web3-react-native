import React from 'react'
import { accountStore } from '../stores/account'
import { addressBookStore } from '../stores/addressBook'

class AppStore {
    public accountStore: typeof accountStore

    public addressBookStore: typeof addressBookStore
    constructor() {
        this.accountStore = accountStore
        this.addressBookStore = addressBookStore
    }
}

export const appStore = new AppStore()
export const AppContext = React.createContext(appStore)

