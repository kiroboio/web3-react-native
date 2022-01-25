import { types, flow } from 'mobx-state-tree'
import { persist } from 'mst-persist'
import { AddressBook } from '..'
import { SecureStorage, SetSecureStorageParams } from '../utils/SecureStorage'
import { CmdActions, CmdBase, CmdStatus, createCommand } from './account'
import web3 from 'web3'

const Address = types.model('Address', {
  key: types.optional(types.identifier, ''),
  address: types.optional(types.string, ''),
})

const SetCmd = CmdBase.named('SetCmd')
const AddCmd = CmdBase.named('AddCmd')
  .props({
    address: types.optional(Address, {}),
  })
  .actions((self) => ({
    prepare(address: typeof self.address) {
      self.address = address
      self.is.prepared()
    },
  }))

type AddManyParams = {
  addresses: IAddress[]
  isMergeAnyway?: boolean
  isReplace?: boolean
}

const CmdAddManyStatus = CmdStatus.named('AddManyCmdStatus')
  .props({
    replace: types.optional(types.boolean, false),
    mergeAnyway: types.optional(types.boolean, false),
})

const CmdAddManyModel = {
  is: types.optional(CmdAddManyStatus, {}),
}
export const CmdAddManyBase = types.model('CmdAddManyBase', CmdAddManyModel).actions(CmdActions)
const AddManyCmd = CmdAddManyBase.named('AddManyCmd')
  .props({
    addresses: types.optional(types.array(Address), []),
  })
  .actions((self) => ({
    prepare({ addresses, isMergeAnyway, isReplace }: AddManyParams) {
      addresses.forEach((address) => {
        self.addresses.push(Address.create(address))
      })
      self.is.prepared()
      self.is.mergeAnyway = Boolean(isMergeAnyway)
      self.is.replace = Boolean(isReplace)
    },
    clear() {
      self.is.withFailMessage = ''
      self.is.mergeAnyway = false
      self.is.replace = false
      self.addresses.clear()
    },
  }))

const UpdateCmd = CmdBase.named('AddCmd')
  .props({
    key: types.optional(types.string, ''),
    address: types.optional(types.string, ''),
  })
  .actions((self) => ({
    prepare(key: typeof self.key, address: typeof self.address) {
      self.key = key
      self.address = address
      self.is.prepared()
    },
  }))

const RemoveCmd = CmdBase.named('AddCmd')
  .props({
    key: types.optional(types.string, ''),
  })
  .actions((self) => ({
    prepare(key: typeof self.key) {
      self.key = key
      self.is.prepared()
    },
  }))

const RemoveAllCmd = CmdBase.named('RemoveAllCmd').actions((self) => ({
  prepare() {
    self.is.prepared()
  },
}))

export interface IAddress {
  key: string
  address: string
}
export interface ICSVAddress {
  name: string
  address: string
}

const Addresses = types.map(Address)

export const AddressBookModel = types
  .model('AddressBook', {
    addresses: Addresses,
    addManyCmd: types.optional(AddManyCmd, {}),
    addCmd: types.optional(AddCmd, {}),
    removeCmd: types.optional(RemoveCmd, {}),
    removeAllCmd: types.optional(RemoveAllCmd, {}),
    updateCmd: types.optional(UpdateCmd, {}),
    setCmd: types.optional(SetCmd, {}),
  })
  .views((self) => ({
    get addMany() {
      return {
        get is() {
          return createCommand(self.addManyCmd.is)
        },
        merge(addresses: IAddress[]) {
          self.addManyCmd.clear()
          self.addManyCmd.prepare({ addresses })
        },
        mergeAnyway() {
          self.addManyCmd.prepare({ addresses: [], isMergeAnyway: true })
        },
        replace(addresses: IAddress[]) {
          self.addManyCmd.clear()
          self.addManyCmd.prepare({ addresses, isReplace: true })
        },
        replaceAnyway() {
          self.addManyCmd.prepare({
            addresses: [],
            isMergeAnyway: true,
            isReplace: true,
          })
        },
        get isReplacing() {
          return self.addManyCmd.is.replace
        },
        get isMerging() {
          return self.addManyCmd.is.running
        },
        get isMergingAnyway() {
          return self.addManyCmd.is.mergeAnyway
        },
        get data() {
          return {
            get addresses() {
              return self.addManyCmd.addresses
            },
          }
        },
      }
    },
    get add() {
      return {
        get is() {
          return createCommand(self.addCmd.is)
        },
        run(address: IAddress) {
          self.addCmd.prepare(address)
        },
        get data() {
          return {
            get address() {
              return self.addCmd.address
            },
          }
        },
      }
    },
    get update() {
      return {
        get is() {
          return createCommand(self.updateCmd.is)
        },
        run({ key, address }: { key: string; address: string }) {
          self.updateCmd.prepare(key, address)
        },
        get data() {
          return {
            get key() {
              return self.updateCmd.key
            },
            get address() {
              return self.updateCmd.address
            },
          }
        },
      }
    },
    get remove() {
      return {
        get is() {
          return createCommand(self.removeCmd.is)
        },
        run({ key }: { key: string }) {
          self.removeCmd.prepare(key)
        },
        get data() {
          return {
            get key() {
              return self.removeCmd.key
            },
          }
        },
      }
    },
    get removeAll() {
      return {
        get is() {
          return createCommand(self.removeAllCmd.is)
        },
        run() {
          self.removeAllCmd.prepare()
        },
      }
    },
    search: ({ input }: { input?: string }) => {
      let storageAddresses: { key: string; address: string }[] = []
      const values = Array.from(self.addresses.values())
      if (!input)
        return values.map(({ key, address }) => ({
          key,
          address,
        }))

      const inputLowerCase = input.toLowerCase()

      values.forEach(({ key, address }) => {
        const keyLowerCase = key.toLowerCase()
        if (
          keyLowerCase === inputLowerCase ||
          String(address) === inputLowerCase
        ) {
          storageAddresses = [{ key, address }, ...storageAddresses]
        } else if (
          keyLowerCase.includes(inputLowerCase) ||
          String(address.toLowerCase()).includes(inputLowerCase)
        ) {
          storageAddresses.push({ key, address })
        }
      })
      return storageAddresses
    },
  }))
  .actions((self) => {
    const addressBookSecureStorage = new SecureStorage()
    const setSecret = flow(function* ({ secret }: { secret: string }) {
      window.localStorage.setItem('addressBookStore', secret)
      const addressBook = yield addressBookSecureStorage.getItem<AddressBook>(
        'addressBookStore'
      )

      if (!addressBook || !addressBook.addresses) return
      const addressMap = addressBook.addresses
      const corruptedKeys: string[] = []

      for (const key of Object.keys(addressMap)) {
        const address = addressMap[key].address
        try {
          if (web3.utils.isAddress(address)) {
            self.addresses.put({ key, address })
          } else {
            corruptedKeys.push(key)
            throw new Error(
              `keys: ${corruptedKeys.join()} was corrupted and deleted from address book`
            )
          }
        } catch (e) {
          const error = e as { message: string; reason: string }
          self.setCmd.failed({ message: error.message || error.reason })
        }
      }
    })
    return {
      setSecret,
      setStorage: (params: SetSecureStorageParams) => {
        addressBookSecureStorage.setSecreteStorage({
          encryptionSecret: params.encryptionSecret,
          encryptionNamespace: params.encryptionNamespace,
          encodingType: params.encodingType,
        })

        persist('addressBookStore', addressBookStore, {
          storage: addressBookSecureStorage,
          jsonify: false,
        })
      },
      addAddress: ({ key, address }: { key: string; address: string }) => {
        if (!web3.utils.isAddress(address)) {
          self.addCmd.failed({
            message: `address ${self.add.data.address.address} not valid`,
          })
          return
        }
        if (self.addresses.has(key)) {
          self.addCmd.failed({
            message: `key ${self.add.data.address.key} already exists`,
          })
          return
        }
        const values = Array.from(self.addresses.values())
        if (values.map((item) => item.address).includes(address)) {
          self.addCmd.failed({
            message: `address ${self.add.data.address.address} already exists`,
          })
          return
        }
        self.addresses.put(Address.create({ key, address }))
      },
      addAddresses: (addresses: { key: string; address: string }[]) => {
        const validAddresses: { key: string; address: string }[] = []
        const prevAddressesSet = new Set(Array.from(self.addresses.values()).map((item)=> item.address))

        const newAddressesSet = new Set(prevAddressesSet);
        for(let i = 0; i < addresses.length; i++) {
          const { key, address } = addresses[i]
          if (key && address && web3.utils.isAddress(address) && !self.addresses.has(key) && !newAddressesSet.has(address)) {
            validAddresses.push(addresses[i])
            newAddressesSet.add(address)
          }
        }
        validAddresses.map((item) => self.addresses.put(Address.create({ key: item.key, address: item.address })))
      },
      removeAddress: ({ key }: { key: string }) => {
        self.addresses.delete(key)
      },
      updateAddress: ({ key, address }: { key: string; address: string }) => {
        self.addresses.put({ key, address })
      },
      clear: () => {
        self.addresses.clear()
      },
    }
  })
  .views((self) => ({
    get addressBook() {
      return self.addresses
    },
    get list() {
      return Array.from(self.addresses.values())
    },
  }))

export const addressBookStore = AddressBookModel.create()
