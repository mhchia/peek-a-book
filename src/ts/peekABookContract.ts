import { ethers } from 'ethers';
import { BigNumber } from 'ethers/utils';

export type AdvertiseLog = {
  adID: BigNumber;
  pair: string;
  buyOrSell: boolean;
  amount: BigNumber;
  peerID: string;
};

export type InvalidateLog = {
  adID: BigNumber;
};

type BlockFilter = {
  fromBlock?: ethers.providers.BlockTag;
  toBlock?: ethers.providers.BlockTag;
};

type AD = { pair: string; buyOrSell: boolean; amount: number; peerID: string };

async function getContractLogs<T>(
  eventFilter: ethers.EventFilter,
  provider: ethers.providers.BaseProvider,
  logDecoder: (event: { data: string; topics: string[] }) => T,
  blockFilter?: BlockFilter | undefined
) {
  const logFilter: any = {
    address: eventFilter.address,
    topics: eventFilter.topics,
  };
  if (blockFilter !== undefined) {
    logFilter.fromBlock = blockFilter.fromBlock;
    logFilter.toBlock = blockFilter.toBlock;
  }
  const rawLogs = await provider.getLogs(logFilter);
  return rawLogs.map(logDecoder);
}

export class PeekABookContract {
  constructor(
    readonly provider: ethers.providers.BaseProvider,
    readonly contractInstance: ethers.Contract,
    readonly blockFilter?: BlockFilter
  ) {}

  async advertise(ad: AD) {
    return await this.contractInstance.advertise(
      ad.pair,
      ad.buyOrSell,
      ad.amount,
      ad.peerID
    );
  }

  async invalidate(adID: number) {
    return await this.contractInstance.invalidate(adID);
  }

  // uint adID, string indexed pairIndex, string pair, bool indexed buyOrSell, uint amount, string peerID
  async getAdvertiseLogs(
    pair: string | null = null,
    buyOrSell: boolean | null = null,
    advertiser: string | null = null
  ) {
    // FIXME: Encode `boolean` on our own. There should be other better ways to do this.
    let buyOrSellEncoded: string | null = null;
    if (buyOrSell !== null) {
      if (buyOrSell) {
        buyOrSellEncoded = '0x01';
      } else {
        buyOrSellEncoded = '0x00';
      }
    }
    const eventAdvertiseFilter = this.contractInstance.filters.Advertise(
      null,
      pair,
      null,
      buyOrSellEncoded,
      null,
      null,
      advertiser
    );
    const decodeEventAdvertise = (event: {
      data: string;
      topics: string[];
    }): AdvertiseLog => {
      const objData = ethers.utils.defaultAbiCoder.decode(
        ['uint', 'string', 'uint', 'string'],
        event.data
      );
      const objTopics = ethers.utils.defaultAbiCoder.decode(
        ['bool'],
        event.topics[2]
      );
      return {
        adID: objData[0],
        pair: objData[1],
        buyOrSell: objTopics[0],
        amount: objData[2],
        peerID: objData[3],
      };
    };
    return await getContractLogs<AdvertiseLog>(
      eventAdvertiseFilter,
      this.provider,
      decodeEventAdvertise,
      this.blockFilter
    );
  }

  async getInvalidateLogs() {
    const eventInvaldiateFilter = this.contractInstance.filters.Invalidate();
    const decodeEventInvalidate = (event: { data: string }): InvalidateLog => {
      const objData = ethers.utils.defaultAbiCoder.decode(['uint'], event.data);
      return {
        adID: objData[0],
      };
    };
    return await getContractLogs<InvalidateLog>(
      eventInvaldiateFilter,
      this.provider,
      decodeEventInvalidate,
      this.blockFilter
    );
  }

  async getValidAdvertisements(
    pair: string | null = null,
    buyOrSell: boolean | null = null,
    advertiser: string | null = null
  ) {
    // NOTE: We iterate both log arrays twice after receiving from the contract.
    //  Porbably it makes sense to refactor.
    const advertiseLogs = await this.getAdvertiseLogs(pair, buyOrSell, advertiser);
    const invalidateLogs = await this.getInvalidateLogs();
    const invalidateMap = new Set<number>(
      invalidateLogs.map((obj) => obj.adID.toNumber())
    );
    // This takes small-oh(`m * n`), where `m = advertiseLogs.length` and
    //  `n = invalidateLogs.length`.
    return advertiseLogs.filter(
      (obj) => !invalidateMap.has(obj.adID.toNumber())
    );
  }
}
