import SecureLS from 'secure-ls'

export type SetSecureStorageParams = {
  encryptionSecret: string
  encodingType: 'aes'
  encryptionNamespace: string
}

export interface ISecureStorage {
  setItem: (itemName: string, item: unknown) => Promise<void>
  getItem: <I>(
    itemName: string,
    isAllKeysData?: boolean | undefined
  ) => Promise<I | undefined>
  getRawItem: (itemName: string) => string
  removeItem: (itemName: string) => void
  removeAll: () => void
  clear: () => void
  getAllKeys: () => string[] | undefined
}

export class SecureStorage implements ISecureStorage {
  private storage: { [key: string]: SecureLS } = {}
  private encryptionNamespace = ''

  public setItem = async (itemName: string, item: unknown): Promise<void> => {
    try {
      this.storage[this.encryptionNamespace].set(itemName, item)
    } catch (e) {
      console.log(e)
    }
  }

  public getItem = async <I>(
    itemName: string,
    isAllKeysData?: boolean
  ): Promise<I | undefined> => {
    try {
      return this.storage[this.encryptionNamespace].get(itemName, isAllKeysData)
    } catch (e) {
      console.log(e)
      return;
    }
  }

  public getRawItem = (itemName: string): string => {
    return window.localStorage.getItem(itemName) || ''
  }

  public removeItem = (itemName: string): void => {
    try {
      this.storage[this.encryptionNamespace].remove(itemName)
    } catch (e) {
      console.log(e)
    }
  }

  public removeAll = (): void => {
    try {
      this.storage[this.encryptionNamespace].removeAll()
    } catch (e) {
      console.log(e)
    }
  }

  public clear = (): void => {
    try {
      this.storage[this.encryptionNamespace].clear()
    } catch (e) {
      console.log(e)
    }
  }

  public getAllKeys = (): string[] | undefined => {
    try {
      return this.storage[this.encryptionNamespace].getAllKeys()
    } catch (e) {
      console.log(e)
      return;
    }
  }

  private createNewSecureSecureStorage = (
    encryptionNamespace: string,
    encryptionSecret?: string,
    encodingType = 'aes',
    replace = false
  ) => {
    try {
      if (replace || !this.storage[encryptionNamespace]) {
        this.encryptionNamespace = encryptionNamespace
        this.storage[encryptionNamespace] = new SecureLS({
          encodingType,
          encryptionSecret,
          isCompression: false,
          encryptionNamespace,
        })
      }
    } catch (e) {
      console.log('asd error ', e)
    }
  }

  public setSecreteStorage = ({
    encryptionSecret,
    encodingType,
    encryptionNamespace,
  }: SetSecureStorageParams): void => {
    let items: [string, unknown][] = []

    if (this.storage[encryptionNamespace]) {
      try {
        items = this.storage[encryptionNamespace]
          .getAllKeys()
          .map((item: string) => [
            item,
            this.storage[encryptionNamespace].get(item),
          ])
      } catch (e) {
        items = []
      }
    }
    this.createNewSecureSecureStorage(
      encryptionNamespace,
      encryptionSecret,
      encodingType,
      true
    )
    try {
      items = this.storage[encryptionNamespace]
        ?.getAllKeys()
        .map((item) => [item, this.storage[encryptionNamespace].get(item)])
    } catch (e) {
      items = []
    }
    if (items) {
      this.storage[encryptionNamespace].removeAll()
      this.storage[encryptionNamespace].resetAllKeys()
    }
    for (const item of items) {
      this.storage[encryptionNamespace].set(item[0], item[1])
    }
  }
}

