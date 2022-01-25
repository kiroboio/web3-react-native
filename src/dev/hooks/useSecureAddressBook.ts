import {useEffect} from 'react';
import {useAccount, usePrevious} from '..';
import {useAddressBook} from '../context/addressBook';
import {useCurrentMutableState as useRef} from './useCurrentMutableState';
import KiroboService from '@kiroboio/safe-transfer-lib';
import web3 from 'web3';
import {toChecksumAddress} from 'web3-utils';

type ActionType = 'add' | 'remove' | 'update' | 'delete' | 'set';
type Address = string;

export type Action = {
  type: ActionType;
  key?: string;
  address?: Address;
  payload?: AddressBook;
};
export type AddressBook = {[key: string]: Address};

const getChainName = (chainId: number | undefined) => {
  if (chainId === 1) return 'main';
  if (chainId === 4) return 'rinkeby';
  return '';
};

const SERVICE = {
  RATES: 'v1/eth/to/usd',
  TOKEN_RATES: 'v1/eth/erc20/rates',
  NETWORKS: 'v1/eth/networks',
  REWARDS(network: string) {
    return `v1/eth/${network}/rewards`;
  },
  BALANCE(network: string) {
    return `v1/eth/${network}/balance`;
  },
  TRANSFERS(network: string) {
    return `v1/eth/${network}/transfers`;
  },
  TRANSFER_REQUEST(network: string) {
    return `v1/eth/${network}/transfer/request`;
  },
  FOLLOW(network: string) {
    return `v1/eth/${network}/action/follow`;
  },
  COLLECT(network: string) {
    return `v1/eth/${network}/action/collect`;
  },
  SWAP(network: string) {
    return `v1/eth/${network}/action/swap`;
  },
  ERC20(network: string) {
    return `v1/eth/${network}/erc20`;
  },
  SECRET(network: string) {
    return `v1/eth/${network}/secret`;
  },
};

const getEncryptedAddressBook = () => {
  return window.localStorage.getItem('addressBookStore') || '';
};

type ErrorType = {message: string; reason: string};
export const useSecureAddressBook = (): typeof secureAddressBook => {
  const {chainId, address} = useAccount();
  const secureAddressBook = useAddressBook();
  const {
    addAddress,
    add,
    remove,
    update,
    addMany,
    clear,
    removeAddress,
    updateAddress,
    setStorage,
    setCmd,
    addCmd,
    addManyCmd,
    updateCmd,
    removeCmd,
    removeAllCmd,
    list,
    addAddresses,
  } = secureAddressBook;

  const prevChainId = usePrevious(chainId);
  const prevAddress = usePrevious(address);

  const __address = useRef(address);
  const __prevAddress = useRef(prevAddress);
  const __prevChainId = useRef(prevChainId);
  const __chainId = useRef(chainId);
  const isAddressBookChanged =
    add.is.ready ||
    remove.is.ready ||
    update.is.ready ||
    addManyCmd.is.done ||
    removeAllCmd.is.ready ||
    setCmd.is.failed;
  useEffect(() => {
    const prevChainId = __prevChainId.current;
    const address = __address.current;
    const prevAddress = __prevAddress.current;
    const chainId = __chainId.current;
    if (prevChainId && prevChainId > 0 && prevAddress === address) {
      const service = KiroboService.getInstance();
      const network = getChainName(chainId);
      if (service && network && isAddressBookChanged) {
        const secretService = service.getService(SERVICE.SECRET(network));
        const secretId = `${address}-${network}`;

        secretService
          .create({
            id: secretId,
            hint: '12345',
            secret: getEncryptedAddressBook(),
          })
          .catch(() => {
            secretService
              .patch(secretId, {
                hint: '12345',
                secret: getEncryptedAddressBook(),
              })
              .catch(() => console.log('asd cannot patch'));
          });
      }
    }
  }, [isAddressBookChanged]);

  const __setStorage = useRef(setStorage);
  useEffect(() => {
    __setStorage.current({
      encryptionNamespace: 'addressBookStore',
      encryptionSecret: '12345',
      encodingType: 'aes',
    });
  }, []);

  const __addAddress = useRef(addAddress);
  const __add = useRef(add);
  const __addCmd = useRef(addCmd);
  const __list = useRef(list);
  useEffect(() => {
    const addAddress = __addAddress.current;
    const add = __add.current;
    const addCmd = __addCmd.current;
    if (!addCmd.is.ready || addCmd.is.running) return;
    try {
      addCmd.start();
      if (!add.data.address.key) throw new Error('key not set');
      if (!add.data.address.address) throw new Error('address not set');
      addAddress(add.data.address);
      addCmd.done();
    } catch (e) {
      const error = e as ErrorType;
      addCmd.failed({message: error.message || error.reason});
    }
  }, [addCmd.is.ready]);

  const __addMany = useRef(addMany);
  const __addManyCmd = useRef(addManyCmd);

  const addAll = () => {
    if (addManyCmd.is.replace) {
      clear();
    }
    addAddresses(addMany.data.addresses.slice(1));

    addManyCmd.done();
  };

  const __addAll = useRef(addAll);
  useEffect(() => {
    const addMany = __addMany.current;
    const addManyCmd = __addManyCmd.current;
    const wrongAddressKeys: string[] = [];
    const wrongAddresses: string[] = [];
    const list = __list.current;
    const addAll = __addAll.current;
    if (!addManyCmd.is.ready || addManyCmd.is.running) return;
    if (!addMany.data.addresses) return;

    try {
      addManyCmd.start();

      const addressSet = new Set(list.map(item => item.address));
      const keySet = new Set(list.map(item => item.key));

      const addressDuplicateSet = new Set();
      const keyDuplicateSet = new Set();
      if (addManyCmd.is.mergeAnyway) {
        addAll();
        return;
      }
      addMany.data.addresses.forEach((item, index) => {
        if (index < 1) return;
        const rowIndex = index + 1;
        try {
          const address = toChecksumAddress(item.address);
          if (!web3.utils.isAddress(address)) {
            wrongAddresses.push(
              `key ${item.key} has a wrong address ${item.address} [row ${rowIndex}]`,
            );
          }

          if (keySet.has(item.key) && !addManyCmd.is.replace) {
            wrongAddressKeys.push(
              `key ${item.key} already exists [row ${rowIndex}]`,
            );
          }

          if (keyDuplicateSet.has(item.key)) {
            wrongAddressKeys.push(
              `duplicate key ${item.key} [row ${rowIndex}]`,
            );
          }
          keyDuplicateSet.add(item.key);

          if (addressSet.has(item.address) && !addManyCmd.is.replace) {
            wrongAddresses.push(
              `address ${item.address} already exists [row ${rowIndex}]`,
            );
          }

          if (addressDuplicateSet.has(item.address)) {
            wrongAddresses.push(
              `duplicate address ${item.address} [row ${rowIndex}]`,
            );
          }
          addressDuplicateSet.add(item.address);
        } catch (e) {
          wrongAddresses.push(
            `key ${item.key} has a wrong address ${item.address} [row ${rowIndex}]`,
          );
        }
      });

      if (wrongAddressKeys.length || wrongAddresses.length) {
        let error = '';
        if (wrongAddressKeys.length && wrongAddresses.length) {
          error = `wrong keys: ${wrongAddressKeys.join()}, wrong addresses: ${wrongAddresses.join()}`;
        } else if (wrongAddressKeys.length) {
          error = `wrong keys: ${wrongAddressKeys.join()}`;
        } else {
          error = `wrong addresses: ${wrongAddresses.join()}`;
        }
        addManyCmd.failed({
          message: error,
        });
      } else {
        addAll();
      }
    } catch (e) {
      const error = e as ErrorType;
      addManyCmd.failed({message: error.message || error.reason});
    }
  }, [addManyCmd.is.ready]);

  const __removeAddress = useRef(removeAddress);
  const __remove = useRef(remove);
  const __removeCmd = useRef(removeCmd);
  useEffect(() => {
    const removeAddress = __removeAddress.current;
    const remove = __remove.current;
    const removeCmd = __removeCmd.current;
    if (!removeCmd.is.ready || removeCmd.is.running) return;
    try {
      removeCmd.start();
      if (!remove.data.key) throw new Error('key not set');
      removeAddress({key: remove.data.key});
      removeCmd.done();
    } catch (e) {
      const error = e as ErrorType;
      removeCmd.failed({message: error.message || error.reason});
    }
  }, [removeCmd.is.ready]);

  const __removeAllCmd = useRef(removeAllCmd);
  const __clear = useRef(clear);
  useEffect(() => {
    const removeAllCmd = __removeAllCmd.current;
    const clear = __clear.current;
    if (!removeAllCmd.is.ready || removeAllCmd.is.running) return;
    try {
      removeAllCmd.start();
      clear();
      removeAllCmd.done();
    } catch (e) {
      const error = e as ErrorType;
      removeAllCmd.failed({message: error.message || error.reason});
    }
  }, [removeAllCmd.is.ready]);

  const __updateAddress = useRef(updateAddress);
  const __update = useRef(update);
  const __updateCmd = useRef(updateCmd);
  useEffect(() => {
    const updateAddress = __updateAddress.current;
    const update = __update.current;
    const updateCmd = __updateCmd.current;
    if (!updateCmd.is.ready || updateCmd.is.running) return;
    try {
      updateCmd.start();
      if (!update.data.key) throw new Error('key not set');
      if (!update.data.address) throw new Error('address not set');
      const address = toChecksumAddress(update.data.address);
      if (!web3.utils.isAddress(address)) throw new Error('address not valid');
      updateAddress({key: update.data.key, address: update.data.address});
      updateCmd.done();
    } catch (e) {
      const error = e as ErrorType;
      updateCmd.failed({message: error.message || error.reason});
    }
  }, [updateCmd.is.ready]);

  return secureAddressBook;
};
