import $ from 'jquery';
import BN from 'bn.js';
import { v4 as uuidv4 } from 'uuid';

import { emitNotification, emitError } from './utils';

import SMPPeer from 'js-smp-peer';
import { PeekABookContract } from './peekABookContract';
import { TNetworkConfig } from './configs';
import { getInputPriceExplanation } from './utils';
import { addMatchingRecord } from './tableMatchingHistory';
import { BigNumber } from 'ethers/utils';

const tableMyADs = $('#tableMyIDs');

/**
 * Input group: new advertisements
 */

export const buttonNewAD = document.querySelector(
  'button#buttonNewAD'
) as HTMLButtonElement;
const inputADBuyOrSell = document.querySelector(
  'select#inputADBuyOrSell'
) as HTMLSelectElement;
const inputADAmount = document.querySelector(
  'input#inputADAmount'
) as HTMLInputElement;
const inputCurrency1 = document.querySelector(
  'input#inputCurrency1'
) as HTMLInputElement;
const spanADWithOrFor = document.querySelector(
  'span#spanADWithOrFor'
) as HTMLSpanElement;
const inputCurrency2 = document.querySelector(
  'input#inputCurrency2'
) as HTMLInputElement;

const dataListERC20Token = document.querySelector(
  'datalist#erc20TokenList'
) as HTMLDataListElement;

inputADBuyOrSell.onchange = () => {
  if (inputADBuyOrSell.value === 'buy') {
    spanADWithOrFor.innerHTML = 'with';
  } else if (inputADBuyOrSell.value === 'sell') {
    spanADWithOrFor.innerHTML = 'for';
  }
};

inputCurrency1.onkeyup = () => {
  if (inputCurrency1.value === '') {
    inputADAmount.placeholder = 'Amount';
  } else {
    inputADAmount.placeholder = `Amount(in ${inputCurrency1.value})`;
  }
};

const erc20TokenList = require('./erc20_tokens.json') as string[][];

erc20TokenList.forEach((item) => {
  const fullname = item[0];
  const abbreviation = item[1];
  const option = document.createElement('option') as HTMLOptionElement;
  option.text = fullname;
  option.value = abbreviation;
  dataListERC20Token.appendChild(option);
});

function getRandomPeerID(): string {
  return uuidv4();
}

export async function cbButtonNewAD(
  contract: PeekABookContract,
  config: TNetworkConfig
) {
  const buyOrSell = inputADBuyOrSell.value === 'buy';
  // TODO: Should change `AD.number` to `BN`?
  const amount = new BN(inputADAmount.value, 10);
  if (inputCurrency1.value === '') {
    emitError('`Currency1` should not be empty');
  }
  if (inputCurrency2.value === '') {
    emitError('`Currency2` should not be empty');
  }
  if (inputADAmount.value === '') {
    emitError('`Amount` should not be empty');
  }
  try {
    const tx = await contract.advertise({
      currency1: inputCurrency1.value,
      currency2: inputCurrency2.value,
      buyOrSell: buyOrSell,
      amount: amount.toNumber(),
      peerID: getRandomPeerID(),
    });
    inputCurrency1.value = '';
    inputCurrency2.value = '';
    inputADBuyOrSell.value = '';
    inputADAmount.value = '';
    const txHash = tx.hash;
    const txExplorerURL = `${config.etherscanURL}/tx/${txHash}`;
    emitNotification(
      'Successfully sent the advertisement transaction ' +
        `<a href="${txExplorerURL}" class="alert-link">${txHash}</a>. ` +
        'Please wait for a while for its confirmation.'
    );
  } catch (e) {
    emitError(`Failed to send the advertisement transaction on chain: ${e}`);
  }
}

/**
 * Table
 */

type PeerInfo = { smpPeer: SMPPeer; price: string };

const mapListeningPeers = new Map<string, PeerInfo>();

export async function updateMyADsTable(
  contract: PeekABookContract,
  myAddr: string
) {
  const myADs = await contract.getValidAdvertisements(null, null, myAddr);
  const reversed = myADs.reverse();
  tableMyADs.bootstrapTable('load', reversed);
}

/**
 * Formatter and events
 */

function getListenPriceDOMID(adID: BigNumber) {
  return `myADsListenPrice_${adID}`;
}

function getListenButtonDOMID(adID: BigNumber) {
  return `myADsListenButton_${adID}`;
}

export function tableMyADsListenFormatter(
  adID: BigNumber,
  peerID: string,
  currency1: string,
  currency2: string
) {
  const tooltips = getInputPriceExplanation(currency1, currency2);
  const priceInputID = getListenPriceDOMID(adID);
  const buttonID = getListenButtonDOMID(adID);
  const peerInfo = mapListeningPeers.get(peerID);
  // Already listening to the peerID. Use the previous price and disable the button and input.
  if (peerInfo !== undefined) {
    return `
<div class="input-group">
  <input type="number" min="1" id="${priceInputID}" placeholder="${tooltips}" aria-label="price" class="form-control" place value="${peerInfo.price}" disabled>
  <div class="input-group-append">
    <button class="btn btn-secondary" id="${buttonID}">Unlisten</button>
  </div>
</div>`;
  } else {
    return `
<div class="input-group">
  <input type="number" min="1" id="${priceInputID}" placeholder="${tooltips}" aria-label="price" class="form-control" place>
  <div class="input-group-append">
    <button class="btn btn-secondary" id="${buttonID}">Listen</button>
  </div>
</div>
    `;
  }
}

const buttonListen = 'Listen';
const buttonUnlisten = 'Unlisten';

export async function tableMyADsListenButtonCB(
  adID: BigNumber,
  peerID: string
) {
  const priceInput = document.querySelector(
    `input#${getListenPriceDOMID(adID)}`
  ) as HTMLInputElement;
  const button = document.querySelector(
    `button#${getListenButtonDOMID(adID)}`
  ) as HTMLButtonElement;
  // Haven't listened
  if (button.innerHTML === buttonListen) {
    if (mapListeningPeers.has(peerID)) {
      emitError(`Peer ID is already listened: peerID=${peerID}`);
    }
    priceInput.disabled = true;
    button.disabled = true;
    const price = priceInput.value;
    if (price === '') {
      emitError('`Price` should not be empty');
    }
    const peerInstance = new SMPPeer(price, peerID);
    peerInstance.on('incoming', (remotePeerID: string, result: boolean) => {
      emitNotification(
        `Finished outgoing price matching with advertisement #${adID}: ` +
          `price=${price}, result=${result}`
      );
      addMatchingRecord(false, peerID, remotePeerID, adID, price, result);
    });
    try {
      await peerInstance.connectToPeerServer();
    } catch (e) {
      priceInput.disabled = false;
      button.disabled = false;
      emitError(`Failed to listen to the matching requests: ${e}`);
    }
    // Finished connecting to the peer server. Now, we can safely add the peer in the map.
    const newPeerID = peerInstance.id;
    mapListeningPeers.set(newPeerID, { smpPeer: peerInstance, price: price });
    button.disabled = false;
    button.innerHTML = buttonUnlisten;
    // Already listened
  } else if (button.innerHTML === buttonUnlisten) {
    const peerInfo = mapListeningPeers.get(peerID);
    mapListeningPeers.delete(peerID);
    if (peerInfo !== undefined) {
      peerInfo.smpPeer.disconnect();
    }
    priceInput.disabled = false;
    button.innerHTML = buttonListen;
  } else {
    // Sanity check
    emitError(`Unrecognized button innerHTML: ${button.innerHTML}`);
  }
}

export function tableMyADsDeleteFormatter() {
  return [
    '<a class="remove" href="javascript:void(0)" title="Remove">',
    '<i class="fa fa-trash text-danger"></i>',
    '</a>',
  ].join('');
}

export async function tableMyADsDeleteCB(
  contract: PeekABookContract,
  config: TNetworkConfig,
  adID: BigNumber
) {
  try {
    const tx = await contract.invalidate(adID.toNumber());
    const txHash = tx.hash;
    const txExplorerURL = `${config.etherscanURL}/tx/${txHash}`;
    emitNotification(
      'Successfully sent the invalidate transaction ' +
        `<a href="${txExplorerURL}" class="alert-link">${txHash}</a>. ` +
        'Please wait for a while for its confirmation.'
    );
  } catch (e) {
    emitError(`Failed to invalidate the advertisement on chain: ${e}`);
  }
}
