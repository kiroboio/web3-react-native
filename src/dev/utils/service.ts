import {ChainsIds, getBlockchainName, getChainName} from '../helpers/chain';
import KiroboService, {ApiService, Maybe} from '@kiroboio/safe-transfer-lib';

export type ServiceKeys = keyof ReturnType<
  typeof serviceStore.getServiceEndpoints
>;
type ServiceType = {
  readonly service: ApiService | undefined;
  readonly isValidChain: boolean;
  chainId: ChainsIds;
};

const initService = {
  service: undefined,
  chainId: -1,
  isValidChain: false,
} as const;

class ServiceStore {
  public get chainId() {
    return this._chainId;
  }
  public set chainId(chainId: ChainsIds) {
    this._chainId = chainId;
    this.create();
  }
  public instance: Maybe<KiroboService>;

  public createInstance = ({
    key,
    secret,
    callback,
  }: {
    key: string;
    secret: string;
    callback?: (message: string, payload: unknown) => void;
  }) => {
    this.instance = KiroboService.createInstance({key, secret}, callback);
  };

  public getServiceEndpoints = ({chainId}: {chainId: ChainsIds}) => {
    const blockchain = getBlockchainName(chainId);
    const network = getChainName(chainId);
    const tokenProtocol = blockchain === 'eth' ? 'erc20' : 'bep20';
    const nftProtocol = blockchain === 'eth' ? 'erc721' : 'bep721';
    const coin = blockchain === 'eth' ? 'eth' : 'bnb';
    return {
      RATES: `v1/${coin}/to/usd`,
      TOKEN_RATES: `v1/${blockchain}/${tokenProtocol}/rates`,
      NETWORKS: `v1/${blockchain}/networks`,
      REWARDS: `v1/${blockchain}/${network}/rewards`,
      BALANCE: `v1/${blockchain}/${network}/balance`,
      BALANCE_OF_NFT: `v1/${blockchain}/${network}/balanceof/erc721`,
      TRANSFERS: `v1/${blockchain}/${network}/transfers`,
      TRANSFER_REQUEST: `v1/${blockchain}/${network}/transfer/request`,
      FOLLOW: `v1/${blockchain}/${network}/action/follow`,
      COLLECT: `v1/${blockchain}/${network}/action/collect`,
      SWAP: `v1/${blockchain}/${network}/action/swap`,
      ERC20: `v1/${blockchain}/${network}/${tokenProtocol}`,
      ERC721: `v1/${blockchain}/${network}/${nftProtocol}`,
      SECRET: `v1/${blockchain}/${network}/secret`,
    };
  };

  private create = () => {
    this.RATES = this.getService({serviceKey: 'RATES'});
    this.TOKEN_RATES = this.getService({serviceKey: 'TOKEN_RATES'});
    this.NETWORKS = this.getService({serviceKey: 'NETWORKS'});
    this.REWARDS = this.getService({serviceKey: 'REWARDS'});
    this.BALANCE = this.getService({serviceKey: 'BALANCE'});
    this.BALANCE_OF_NFT = this.getService({serviceKey: 'BALANCE_OF_NFT'});
    this.TRANSFERS = this.getService({serviceKey: 'TRANSFERS'});
    this.TRANSFER_REQUEST = this.getService({serviceKey: 'TRANSFER_REQUEST'});
    this.FOLLOW = this.getService({serviceKey: 'FOLLOW'});
    this.COLLECT = this.getService({serviceKey: 'COLLECT'});
    this.SWAP = this.getService({serviceKey: 'SWAP'});
    this.ERC20 = this.getService({serviceKey: 'ERC20'});
    this.ERC721 = this.getService({serviceKey: 'ERC721'});
    this.SECRET = this.getService({serviceKey: 'SECRET'});
  };

  public RATES: ServiceType = initService;
  public TOKEN_RATES: ServiceType = initService;
  public NETWORKS: ServiceType = initService;
  public REWARDS: ServiceType = initService;
  public BALANCE: ServiceType = initService;
  public BALANCE_OF_NFT: ServiceType = initService;
  public TRANSFERS: ServiceType = initService;
  public TRANSFER_REQUEST: ServiceType = initService;
  public FOLLOW: ServiceType = initService;
  public COLLECT: ServiceType = initService;
  public SWAP: ServiceType = initService;
  public ERC20: ServiceType = initService;
  public ERC721: ServiceType = initService;
  public SECRET: ServiceType = initService;

  public getServiceWithCustomChainId = ({
    serviceKey,
    customChainId,
  }: {
    serviceKey: ServiceKeys;
    customChainId: ChainsIds;
  }) => {
    return this.getService({serviceKey, customChainId});
  };

  private _chainId: ChainsIds = -1;
  private getCurrentChainId = () => {
    return this._chainId;
  };

  private getService = ({
    serviceKey,
    customChainId,
  }: {
    serviceKey: ServiceKeys;
    customChainId?: ChainsIds;
  }) => {
    const {
      instance,
      chainId: storeChainId,
      getServiceEndpoints,
      getCurrentChainId,
    } = this;
    const chainId = customChainId ? customChainId : storeChainId;
    return {
      get service() {
        return instance?.getService(
          getServiceEndpoints({chainId: this.chainId})[serviceKey],
        );
      },
      get isValidChain() {
        return this.chainId === getCurrentChainId();
      },
      chainId,
    };
  };
}

export const serviceStore = new ServiceStore();
