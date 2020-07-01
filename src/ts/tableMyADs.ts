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

const mapListeningPeers = new Map<string, SMPPeer>();

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

export function tableMyADsListenFormatter(
  adID: BigNumber,
  currency1: string,
  currency2: string
) {
  const tooltips = getInputPriceExplanation(currency1, currency2);
  return `
  <div class="input-group">
    <input type="number" min="1" id="myADsListenPrice_${adID}" placeholder="${tooltips}" aria-label="price" class="form-control" place>
    <div class="input-group-append">
      <button class="btn btn-secondary" id="myADsListenButton_${adID}">Listen</button>
    </div>
  </div>
  `;
}

const buttonListen = 'Listen';
const buttonUnlisten = 'Unlisten';

export async function tableMyADsListenButtonCB(
  adID: BigNumber,
  peerID: string
) {
  const priceInput = document.querySelector(
    `input#myADsListenPrice_${adID}`
  ) as HTMLInputElement;
  const price = priceInput.value;
  if (price === '') {
    emitError('`Price` should not be empty');
  }
  const button = document.querySelector(
    `button#myADsListenButton_${adID}`
  ) as HTMLButtonElement;
  if (button.innerHTML === buttonListen) {
    if (mapListeningPeers.has(peerID)) {
      emitError(`Peer ID is already listened: peerID=${peerID}`);
    }
    priceInput.disabled = true;
    button.disabled = true;

    const peerInstance = new SMPPeer(price, peerID);
    peerInstance.on('incoming', (remotePeerID: string, result: boolean) => {
      emitNotification(
        `Finished outgoing price matching with advertisement #${adID}: ` +
          `price=${price}, result=${result}`
      );
      addMatchingRecord(
        false,
        peerID,
        remotePeerID,
        adID,
        priceInput.value,
        result
      );
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
    mapListeningPeers.set(newPeerID, peerInstance);
    button.disabled = false;
    button.innerHTML = buttonUnlisten;
  } else if (button.innerHTML === buttonUnlisten) {
    const peerInstance = mapListeningPeers.get(peerID);
    mapListeningPeers.delete(peerID);
    if (peerInstance !== undefined) {
      peerInstance.disconnect();
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
