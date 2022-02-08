import Web3 from 'web3';

export class InAppWalletConnector  {
  public static activeAccount: string | undefined;
  public static address: string;
  public static web3: Web3;
  public static currentChainId: number;
  public static providers: { [chainId: number]: string };

  constructor({
    url,
    privateKey,
    chainId,
  }: { url: string, privateKey: string, chainId: 1 | 4 }) {
    const web3 = new Web3(
      new Web3.providers.HttpProvider(url),
    );

    const address = web3.eth.accounts.privateKeyToAccount(privateKey).address;
    web3.eth.accounts.wallet.add({
      privateKey,
      address,
    });

    InAppWalletConnector.providers = { [chainId]: url };
    InAppWalletConnector.currentChainId = chainId;
    InAppWalletConnector.web3 = web3;
    InAppWalletConnector.activeAccount = address;
    InAppWalletConnector.address = address;

  }

  public static getProvider(): string {
    return InAppWalletConnector.providers[InAppWalletConnector.currentChainId];
  }

  public static getChainId(): number {
    return InAppWalletConnector.currentChainId;
  }

  public static getAccount(): string {
    return InAppWalletConnector.activeAccount || InAppWalletConnector.address;
  }

}
