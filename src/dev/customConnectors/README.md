# Custom Web3-React connector

[web3-react connectos](https://github.com/NoahZinsmeister/web3-react/tree/v6/docs/connectors) 

With custom connector you can use [web3-react library](https://github.com/NoahZinsmeister/web3-react) or [useWeb3 hook](./hooks/modules#useweb3) without 3rd party connectors like Metamask, WalletConnect etc.

 ```typescript
 const getLibrary = (
   provider: provider,
   connector?: AbstractConnector | IInAppWalletConnector
 ) => {
   if (connector) {
     const appConnector = connector as IInAppWalletConnector
     if (appConnector.name === Connectors.InAppWallet) {
       const web3 = appConnector.web3
       return web3
     }
   }
   return new Web3(provider)
 }
 
 export const Web3Provider: React.FC = () => {
   return (
     <Web3ReactProvider getLibrary={getLibrary}>
       <Web3ProviderUpdater />
     </Web3ReactProvider>
   )
 }
 
 ```

- *<a href="./customConnectors/interfaces/IInAppWalletConnector">In App Wallet Connector Interface</a>*

