import Web3 from 'web3';
import { utils } from 'ethers';
import { AbstractConnector } from '@web3-react/abstract-connector';
import { Connectors } from '../hooks/useWeb3';
import EncryptedStorage from 'react-native-encrypted-storage';

export interface NetworkConnectorArguments {
  urls: {
    [chainId: number]: string;
  };
  defaultChainId?: number;
}

export interface IInAppWalletConnector {
  name: string;
  web3: Web3;
  activate(): Promise<{ provider: string; chainId: number; account: string }>;
  getProvider(): Promise<string>;
  getChainId(): Promise<number>;
  getAccount(): Promise<string | null>;
  deactivate(): void;
  changeChainId(chainId: number): void;
}

export class InAppWalletConnector
  extends AbstractConnector
  implements IInAppWalletConnector {
  private secureStorage = EncryptedStorage;

  public static DEFAULT_PATH = "m/44'/60'/0'/0/0";

  public static activeAccount: string | undefined;

  private getPaths = async () => {
    try {
      const paths = await this.secureStorage.getItem('paths') || '{}';
      return JSON.parse(paths);
    } catch (e) {
      return {};
    }
  };

  public paths: Promise<{ [key: string]: { [key: number]: string } }> = this.getPaths();

  public static setActiveAccount = (account: string | undefined): void => {
    InAppWalletConnector.activeAccount = account;
  };
  public addresses: string[] = [];

  public name = Connectors.InAppWallet;
  public web3: Web3;

  private readonly providers: { [chainId: number]: string };
  private currentChainId: number;
  private static mnemonic: string | undefined =
    'front assume robust donkey senior economy maple enhance click bright game alcohol';

  public static clearMnemonic(): void {
    InAppWalletConnector.mnemonic = undefined;
  }
  public static setMnemonic(mnemonic: string): void {
    InAppWalletConnector.mnemonic = mnemonic;
  }
  private hdNode: utils.HDNode;

  public getPrivateKeys = async (): Promise<string[]> => {
    if (!InAppWalletConnector.mnemonic) throw new Error('mnemonic not found');
    const privateKeys: string[] = [];
    const walletFirst = this.hdNode.derivePath(
      InAppWalletConnector.DEFAULT_PATH,
    );

    const paths = await this.paths;
    if (paths[walletFirst.address]) {
      Object.keys(paths[walletFirst.address]).map((key: string) =>
        privateKeys.push(
          this.hdNode.derivePath(`m/44'/60'/0'/0/${key}`).privateKey,
        ),
      );
    } else {
      paths[walletFirst.address] = { 0: walletFirst.address };
      privateKeys.push(walletFirst.privateKey);
    }

    console.log({ privateKeys })
    return privateKeys;
  };



  constructor({
    url,
    privateKey,
    chainId,
  }: { url: string, privateKey: string, chainId: 1 | 4 }) {
    super()

    console.log("create wallet")
    const web3 = new Web3(
      new Web3.providers.HttpProvider(url),
    );

    const addresses = new Set<string>();

    const address = web3.eth.accounts.privateKeyToAccount(privateKey).address;
    web3.eth.accounts.wallet.add({
      privateKey,
      address,
    });
    addresses.add(address);

    InAppWalletConnector.activeAccount =
      InAppWalletConnector.activeAccount || Array.from(addresses)[0];

    this.hdNode = utils.HDNode.fromMnemonic(InAppWalletConnector.mnemonic || "");

    console.log({ hdnode: this.hdNode, addresses })
    this.providers = { [chainId]: url };
    this.currentChainId = chainId;
    this.web3 = web3;
    this.addresses = Array.from(addresses);

    this.activate();
    this.getPrivateKeys();
  }

  public handleAccountChanged(account: string): void {
    InAppWalletConnector.setActiveAccount(account);
    this.emitUpdate({ account });
  }

  public addWalletAddress = async (): Promise<void> => {
    console.log("addWalletAddress")
    const walletFirstAddress = this.hdNode.derivePath(
      InAppWalletConnector.DEFAULT_PATH,
    ).address;

    console.log({ walletFirstAddress })
    const setNewAddress = (privateKey: string) => {
      const { address } = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      console.log({ newAddress: address })
      console.log({ privateKey })
      this.web3.eth.accounts.wallet.add({
        privateKey,
        address,
      });
      this.addresses.push(address);
      this.secureStorage.setItem('paths', JSON.stringify(this.paths));
    };

    const paths = await this.paths;
    const onEmptyKeyNotFounded = () => {
      const keysAmount: number = Object.keys(
        paths[walletFirstAddress],
      ).length;
      const walletAccount = this.hdNode.derivePath(
        `m/44'/60'/0'/0/${keysAmount}`,
      );
      paths[walletFirstAddress][keysAmount] = walletAccount.address;
      const privateKey = walletAccount.privateKey;

      setNewAddress(privateKey);
    };

    let index = 0;
    for (const key of Object.keys(paths[walletFirstAddress])) {
      if (Number(key) !== index) {
        const walletAccount = this.hdNode.derivePath(`m/44'/60'/0'/0/${index}`);
        paths[walletFirstAddress][index] = walletAccount.address;
        const privateKey = walletAccount.privateKey;

        setNewAddress(privateKey);
        break;
      } else if (
        index ===
        Object.keys(paths[walletFirstAddress]).length - 1
      ) {
        onEmptyKeyNotFounded();
      }
      index++;
    }
  };

  public removeWalletAddress = async (address: string): Promise<void> => {
    this.web3.eth.accounts.wallet.remove(address);
    this.addresses = this.addresses.filter(a => a !== address);
    const walletFirstAddress = this.hdNode.derivePath(
      InAppWalletConnector.DEFAULT_PATH,
    ).address;

    const paths = await this.paths;
    Object.keys(paths[walletFirstAddress]).forEach((key: string) => {
      if (paths[walletFirstAddress][Number(key)] === address) {
        delete paths[walletFirstAddress][Number(key)];
        this.secureStorage.setItem('paths', JSON.stringify(paths));
      }
    });
  };

  public static account?: string;

  public async activate(): Promise<{
    provider: string;
    chainId: number;
    account: string;
  }> {
    return {
      provider: this.providers[this.currentChainId],
      chainId: this.currentChainId,
      account: InAppWalletConnector.activeAccount || this.addresses[0],
    };
    
  }

  public async getProvider(): Promise<string> {
    return this.providers[this.currentChainId];
  }

  public async getChainId(): Promise<number> {
    return this.currentChainId;
  }

  public async getAccount(): Promise<string> {
    return InAppWalletConnector.activeAccount || this.addresses[0];
  }

  public deactivate(): undefined {
    return;
  }

  public changeChainId(chainId: number): void {
    this.currentChainId = chainId;
    this.emitUpdate({ provider: this.providers[this.currentChainId], chainId });
  }
}
