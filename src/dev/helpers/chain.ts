export const chainIds = [1, 4, 56, 97, -1] as const;
export type ChainsIds = typeof chainIds[number];

export const getChainName = (
  chainId: number | undefined,
): 'main' | 'rinkeby' | 'test' | '' => {
  if (chainId === 1) return 'main';
  if (chainId === 4) return 'rinkeby';
  if (chainId === 56) return 'main';
  if (chainId === 97) return 'test';
  return 'main';
};

export const getLocalChainName = (
  chainId: number | undefined,
): 'main' | 'rinkeby' | 'bsc_main' | 'bsc_test' | '' => {
  if (chainId === 1) return 'main';
  if (chainId === 4) return 'rinkeby';
  if (chainId === 56) return 'bsc_main';
  if (chainId === 97) return 'bsc_test';
  return '';
};

export const getLocalChainNameByNetworkId = ({
  networkId,
  blockchainName,
}: {
  networkId: string;
  blockchainName: 'eth' | 'bsc';
}): 'main' | 'rinkeby' | 'bsc_main' | 'bsc_test' | '' => {
  if (networkId === 'main' && blockchainName === 'eth') return 'main';
  if (networkId === 'rinkeby' && blockchainName === 'eth') return 'rinkeby';
  if (networkId === 'main' && blockchainName === 'bsc') return 'bsc_main';
  if (networkId === 'test' && blockchainName === 'bsc') return 'bsc_test';
  return '';
};

export const getChainIdByNetworkId = ({
  networkId,
  blockchainName,
}: {
  networkId: string;
  blockchainName: 'eth' | 'bsc';
}): ChainsIds => {
  if (networkId === 'main' && blockchainName === 'eth') return 1;
  if (networkId === 'rinkeby' && blockchainName === 'eth') return 4;
  if (networkId === 'main' && blockchainName === 'bsc') return 56;
  if (networkId === 'test' && blockchainName === 'bsc') return 97;
  return -1;
};

export const getBlockchainName = (
  chainId: number | undefined,
): 'eth' | 'bsc' | undefined => {
  if (chainId === 1) return 'eth';
  if (chainId === 4) return 'eth';
  if (chainId === 56) return 'bsc';
  if (chainId === 97) return 'bsc';
  return 'eth';
};
