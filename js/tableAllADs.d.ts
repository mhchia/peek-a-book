import { PeekABookContract } from './peekABookContract';
import { BigNumber } from 'ethers/utils';
export declare function updateAllADsTable(contract: PeekABookContract): Promise<void>;
/**
 * Formatter and events
 */
export declare function tableAllADsMatchFormatter(adID: BigNumber, currency1: string, currency2: string): string;
export declare function tableAllADsMatchCB(adID: BigNumber, remotePeerID: string): Promise<void>;
