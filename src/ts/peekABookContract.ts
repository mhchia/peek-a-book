import { ethers } from 'ethers';
import { BigNumber } from 'ethers/utils';

const defaultGasPrice = 100 * 10 ** 9; // 100 GWei

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

type AD = {
  buyOrSell: boolean;
  amount: number;
  currency1: string;
  currency2: string;
  peerID: string;
};
type ADWithID = {
  adID: BigNumber;
  buyOrSell: boolean;
  amount: number;
  currency1: string;
  currency2: string;
  peerID: string;
};

const splitter = '/';

function getPairName(currency1: string, currency2: string): string {
  return `${currency1}${splitter}${currency2}`;
}

function getCurrenciesByPairName(pairName: string): string[] {
  const currencyArr = pairName.split(splitter);
  if (currencyArr.length !== 2) {
    throw new Error(
      `invalid pair name: ${pairName} should be splitted by \`${splitter}\``
    );
  }
  return currencyArr;
}

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
  const res: T[] = [];
  for (const log of rawLogs) {
    try {
      res.push(logDecoder(log));
    } catch (e) {
      // Ignore invalid formats
    }
  }
  return res;
}

export class PeekABookContract {
  constructor(
    readonly provider: ethers.providers.BaseProvider,
    readonly contractInstance: ethers.Contract,
    readonly blockFilter?: BlockFilter
  ) {}

  async advertise(ad: AD) {
    return await this.contractInstance.advertise(
      getPairName(ad.currency1, ad.currency2),
      ad.buyOrSell,
      ad.amount,
      ad.peerID,
      { gasPrice: defaultGasPrice }
    );
  }

  async invalidate(adID: number) {
    return await this.contractInstance.invalidate(adID, {
      gasPrice: defaultGasPrice,
    });
  }

  async getAdvertiseLogs(
    pair: { currency1: string; currency2: string } | null = null,
    buyOrSell: boolean | null = null,
    advertiser: string | null = null
  ) {
    let pairStr: string | null = null;
    if (pair !== null) {
      pairStr = getPairName(pair.currency1, pair.currency2);
    }
    // FIXME: Encode `boolean` in a better way, instead of doing it our own.
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
      pairStr,
      null,
      buyOrSellEncoded,
      null,
      null,
      advertiser
    );
    const decodeEventAdvertise = (event: {
      data: string;
      topics: string[];
    }): ADWithID => {
      const objData = ethers.utils.defaultAbiCoder.decode(
        ['uint', 'string', 'uint', 'string'],
        event.data
      );
      const objTopics = ethers.utils.defaultAbiCoder.decode(
        ['bool'],
        event.topics[2]
      );
      const pair = objData[1];
      const parsedPair = getCurrenciesByPairName(pair);
      return {
        adID: objData[0],
        currency1: parsedPair[0],
        currency2: parsedPair[1],
        buyOrSell: objTopics[0],
        amount: objData[2],
        peerID: objData[3],
      };
    };
    return await getContractLogs<ADWithID>(
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
    pair: { currency1: string; currency2: string } | null = null,
    buyOrSell: boolean | null = null,
    advertiser: string | null = null
  ): Promise<ADWithID[]> {
    // NOTE: We iterate both log arrays twice after receiving from the contract.
    //  Porbably it makes sense to refactor.

    const advertiseLogs = await this.getAdvertiseLogs(
      pair,
      buyOrSell,
      advertiser
    );
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
