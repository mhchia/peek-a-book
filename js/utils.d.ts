import { BigNumber } from 'ethers/utils';
export declare function emitError(errMsg: string): void;
export declare function emitNotification(msg: string): void;
export declare const spinnerHTML = "\n<div class=\"spinner-border spinner-border-sm\" role=\"status\">\n  <span class=\"sr-only\">Loading...</span>\n</div>";
export declare function getInputPriceExplanation(currency1: string, currency2: string): string;
export declare function getRowDescription(adID: BigNumber, buyOrSell: boolean, amount: number, currency1: string, currency2: string): string;
