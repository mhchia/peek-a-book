import { BigNumber } from 'ethers/utils';
export declare function initializeMatchingHistoryTable(): void;
export declare function addMatchingRecord(isInitiator: boolean, localPeerID: string, remotePeerID: string, adID: BigNumber, price: string, result: boolean): void;
