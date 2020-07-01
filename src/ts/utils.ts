import { BigNumber } from 'ethers/utils';

const topBar = document.querySelector('div#topBar') as HTMLDivElement;

export function emitError(errMsg: string) {
  topBar.innerHTML = `
  <div class="alert alert-danger alert-dismissible fade show" role="alert">
    ${errMsg}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>`;
  throw new Error(errMsg);
}

export function emitNotification(msg: string) {
  topBar.innerHTML = `
  <div class="alert alert-success alert-dismissible fade show" role="alert">
    ${msg}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>`;
}

export const spinnerHTML = `
<div class="spinner-border spinner-border-sm" role="status">
  <span class="sr-only">Loading...</span>
</div>`;

export function getInputPriceExplanation(
  currency1: string,
  currency2: string
): string {
  return `Price(# ${currency2} per ${currency1})`;
}

export function getRowDescription(
  adID: BigNumber,
  buyOrSell: boolean,
  amount: number,
  currency1: string,
  currency2: string
): string {
  let buyOrSellStr: string;
  if (buyOrSell) {
    buyOrSellStr = '<span class="text-success"><strong>buying</strong></span>';
  } else {
    buyOrSellStr = '<span class="text-danger"><strong>selling</strong></span>';
  }
  const withOrFor: string = buyOrSell ? 'with' : 'for';
  return `Advertiser <strong>${adID}</strong> is ${buyOrSellStr} <strong>${amount}</strong> <strong>${currency1}</strong> ${withOrFor} <strong>${currency2}</strong>`;
}
