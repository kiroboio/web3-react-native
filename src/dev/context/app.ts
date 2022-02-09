import React from 'react'
import { accountStore } from '../stores/account'

class AppStore {
    public accountStore: typeof accountStore
    constructor() {
        this.accountStore = accountStore
    }
}

export const appStore = new AppStore()
export const AppContext = React.createContext(appStore)

