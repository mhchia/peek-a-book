import { ethers } from 'ethers';
import { BigNumber } from 'ethers/utils';
declare type AdvertiseLog = {
    adID: BigNumber;
    pair: string;
    buyOrSell: boolean;
    amount: BigNumber;
    peerID: string;
};
declare type InvalidateLog = {
    adID: BigNumber;
};
declare type BlockFilter = {
    fromBlock?: ethers.providers.BlockTag;
    toBlock?: ethers.providers.BlockTag;
};
declare type AD = {
    pair: string;
    buyOrSell: boolean;
    amount: number;
    peerID: string;
};
export declare class PeekABookContract {
    readonly provider: ethers.providers.BaseProvider;
    readonly contractInstance: ethers.Contract;
    readonly blockFilter?: BlockFilter | undefined;
    constructor(provider: ethers.providers.BaseProvider, contractInstance: ethers.Contract, blockFilter?: BlockFilter | undefined);
    advertise(ad: AD): Promise<any>;
    invalidate(adID: number): Promise<any>;
    getAdvertiseLogs(pair?: string | null, buyOrSell?: boolean | null, peerID?: string | null): Promise<AdvertiseLog[]>;
    getInvalidateLogs(): Promise<InvalidateLog[]>;
    getValidAdvertisements(): Promise<AdvertiseLog[]>;
}
export {};
