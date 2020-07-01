import { ethers } from 'ethers';
import { BigNumber } from 'ethers/utils';
export declare type AdvertiseLog = {
    adID: BigNumber;
    pair: string;
    buyOrSell: boolean;
    amount: BigNumber;
    peerID: string;
};
export declare type InvalidateLog = {
    adID: BigNumber;
};
declare type BlockFilter = {
    fromBlock?: ethers.providers.BlockTag;
    toBlock?: ethers.providers.BlockTag;
};
declare type AD = {
    buyOrSell: boolean;
    amount: number;
    currency1: string;
    currency2: string;
    peerID: string;
};
declare type ADWithID = {
    adID: BigNumber;
    buyOrSell: boolean;
    amount: number;
    currency1: string;
    currency2: string;
    peerID: string;
};
export declare class PeekABookContract {
    readonly provider: ethers.providers.BaseProvider;
    readonly contractInstance: ethers.Contract;
    readonly blockFilter?: BlockFilter | undefined;
    constructor(provider: ethers.providers.BaseProvider, contractInstance: ethers.Contract, blockFilter?: BlockFilter | undefined);
    advertise(ad: AD): Promise<any>;
    invalidate(adID: number): Promise<any>;
    getAdvertiseLogs(pair?: {
        currency1: string;
        currency2: string;
    } | null, buyOrSell?: boolean | null, advertiser?: string | null): Promise<ADWithID[]>;
    getInvalidateLogs(): Promise<InvalidateLog[]>;
    getValidAdvertisements(pair?: {
        currency1: string;
        currency2: string;
    } | null, buyOrSell?: boolean | null, advertiser?: string | null): Promise<ADWithID[]>;
}
export {};
