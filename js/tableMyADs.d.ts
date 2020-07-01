import { PeekABookContract } from './peekABookContract';
import { TNetworkConfig } from './configs';
import { BigNumber } from 'ethers/utils';
/**
 * Input group: new advertisements
 */
export declare const buttonNewAD: HTMLButtonElement;
export declare function cbButtonNewAD(contract: PeekABookContract, config: TNetworkConfig): Promise<void>;
export declare function updateMyADsTable(contract: PeekABookContract, myAddr: string): Promise<void>;
/**
 * Formatter and events
 */
export declare function tableMyADsListenFormatter(adID: BigNumber, currency1: string, currency2: string): string;
export declare function tableMyADsListenButtonCB(adID: BigNumber, peerID: string): Promise<void>;
export declare function tableMyADsDeleteFormatter(): string;
export declare function tableMyADsDeleteCB(contract: PeekABookContract, config: TNetworkConfig, adID: BigNumber): Promise<void>;
