import $ from 'jquery';
import SMPPeer from 'js-smp-peer';
import { PeekABookContract } from './peekABookContract';
import {
  getInputPriceExplanation,
  spinnerHTML,
  emitError,
  emitNotification,
} from './utils';
import { peerServerGetPeersURL } from './configs';
import { addMatchingRecord } from './tableMatchingHistory';
import { BigNumber } from 'ethers/utils';
import { getPeers } from './peers';

const matchButtonName = 'Match';
const pollPeersInterval = 1000;
const updateOnlineInterval = 500;

const tableAllADs = $('#tableAllADs');

function updateAllADsTablePriceMatching(
  peerID: string,
  adID: number,
  currency1: string,
  currency2: string,
  onlinePeers: Set<string>
) {
  const price = document.querySelector(
    `input#adsSMPPrice_${adID}`
  ) as HTMLInputElement;
  const matchButton = document.querySelector(
    `button#buttonRun_${adID}`
  ) as HTMLButtonElement;
  // SMP is running. Don't change the state of the price and button here
  if (matchButton.innerHTML === spinnerHTML) {
    return;
  }
  if (onlinePeers.has(peerID)) {
    price.disabled = false;
    price.placeholder = getInputPriceExplanation(currency1, currency2);
    matchButton.disabled = false;
  } else {
    price.disabled = true;
    price.placeholder = 'Advertiser is offline...';
    matchButton.disabled = true;
  }
}

let pollPeersTimeoutID: NodeJS.Timeout | undefined;
let updateInputTimeoutID: NodeJS.Timeout | undefined;
let onlinePeers: Set<string>;

export async function updateAllADsTable(contract: PeekABookContract) {
  // Remove the previous timer if any because we are setting up a new one later in this function.
  if (updateInputTimeoutID !== undefined) {
    clearInterval(updateInputTimeoutID);
  }
  if (pollPeersTimeoutID !== undefined) {
    clearInterval(pollPeersTimeoutID);
  }
  // Automatically update online/offline after the table is loaded with data
  // NOTE: `onLoadSuccess`(load-success.bs.table)[https://bootstrap-table.com/docs/api/events/#onloadsuccess]
  //  is not working somehow. Use `onPostBody` instead.
  onlinePeers = await getPeers(peerServerGetPeersURL);
  pollPeersTimeoutID = setInterval(async () => {
    onlinePeers = await getPeers(peerServerGetPeersURL);
  }, pollPeersInterval);

  tableAllADs.on('post-body.bs.table', function (event, data) {
    tableAllADs.off('post-body.bs.table');
    updateInputTimeoutID = setInterval(() => {
      const tS = performance.now();
      for (const ad of data) {
        try {
          updateAllADsTablePriceMatching(
            ad.peerID,
            ad.adID,
            ad.currency1,
            ad.currency2,
            onlinePeers
          );
        } catch (e) {
          // Ignore error to make `for` loop finish.
        }
      }
      console.debug(
        `Spent ${performance.now() - tS} ms on updating all online status ` +
          'for table "All Advertisements"'
      );
    }, updateOnlineInterval);
  });

  const validADs = await contract.getValidAdvertisements();
  const reversed = validADs.reverse();
  tableAllADs.bootstrapTable('load', reversed);
}

/**
 * Formatter and events
 */

export function tableAllADsMatchFormatter(
  adID: BigNumber,
  currency1: string,
  currency2: string
) {
  const descrption = getInputPriceExplanation(currency1, currency2);
  return `
  <div class="input-group">
    <input type="number" min="1" id="adsSMPPrice_${adID}" placeholder="${descrption}" aria-label="price" class="form-control" place>
    <div class="input-group-append">
      <button class="btn btn-secondary" id="buttonRun_${adID}">${matchButtonName}</button>
    </div>
  </div>
  `;
}

export async function tableAllADsMatchCB(
  adID: BigNumber,
  remotePeerID: string
) {
  const priceInput = document.querySelector(
    `input#adsSMPPrice_${adID}`
  ) as HTMLInputElement;
  const price = priceInput.value;
  if (price === '') {
    emitError('`Price` should not be empty');
  }
  const button = document.querySelector(
    `button#buttonRun_${adID}`
  ) as HTMLButtonElement;
  // Disable the button in case accidental clicks.
  if (button.disabled) {
    return;
  }
  button.innerHTML = spinnerHTML;
  button.disabled = true;
  priceInput.disabled = true;
  try {
    // Create a temporary `SMPPeer` to run SMP with the remote peer.
    const peerInstance = new SMPPeer(price, undefined);
    await peerInstance.connectToPeerServer();
    const localPeerID = peerInstance.id;
    const result = await peerInstance.runSMP(remotePeerID);
    // Since we already get the result, close the peer instance.
    peerInstance.disconnect();
    emitNotification(
      `Finished matching price with advertisement #${adID}: price=${price}, result=${result}`
    );
    addMatchingRecord(true, localPeerID, remotePeerID, adID, price, result);
  } catch (e) {
    emitError(`Failed to match with the advertiser: ${e}`);
  } finally {
    // Recover the disabled button and input
    button.innerHTML = matchButtonName;
    button.disabled = false;
    priceInput.disabled = false;
  }
}
