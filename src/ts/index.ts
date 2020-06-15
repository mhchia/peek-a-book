import $ from 'jquery';

import BN from 'bn.js';
import { ethers } from 'ethers';
import SMPPeer from 'js-smp-peer';

import 'bootstrap';
import 'bootstrap-table';

import { contractAtBlock, contractAddress } from './config';
import { AdvertiseLog, PeekABookContract } from './peekABookContract';

const tableMyADs = $('#tableMyIDs');
const tableValidADs = $('#tableValidADs');

const buttonNewAD = document.querySelector(
  'button#buttonNewAD'
) as HTMLButtonElement;
const inputADPair = document.querySelector(
  'input#inputADPair'
) as HTMLInputElement;
const inputADAmount = document.querySelector(
  'input#inputADAmount'
) as HTMLInputElement;
const inputADBuyOrSell = document.querySelector(
  'select#inputADBuyOrSell'
) as HTMLSelectElement;
const inputADPeerID = document.querySelector(
  'input#inputADPeerID'
) as HTMLInputElement;

const metamaskErrorDOMID = 'metamaskError';

const mapListeningPeers = new Map<string, SMPPeer>();

if ((window as any).ethereum === undefined) {
  const e = document.querySelector(
    `div#${metamaskErrorDOMID}`
  ) as HTMLDivElement;
  e.innerHTML = `
<div class="alert alert-danger" role="alert">
  Metamask is required for this page to work.
</div>`;
  throw new Error('Metamask is required for this page to work');
}

const provider = new ethers.providers.Web3Provider((window as any).ethereum);
const signer0 = provider.getSigner(0);

const contractJSON = require('../../build/contracts/PeekABook.json');

async function initContract() {
  const contract = new ethers.Contract(
    contractAddress,
    contractJSON.abi,
    signer0
  );
  await contract.deployed();
  return new PeekABookContract(provider, contract, {
    fromBlock: contractAtBlock,
  });
}

function fillMyADsTable(logs: AdvertiseLog[]) {
  const data = logs
    .map((obj) => {
      return {
        adID: obj.adID.toNumber(),
        pair: obj.pair,
        buyOrSell: obj.buyOrSell ? 'Buy' : 'Sell',
        amount: obj.amount.toNumber(),
        peerID: obj.peerID,
      };
    })
    .reverse();
  tableMyADs.bootstrapTable('load', data);
}

function fillValidADsTable(logs: AdvertiseLog[]) {
  const data = logs
    .map((obj) => {
      return {
        adID: obj.adID.toNumber(),
        pair: obj.pair,
        buyOrSell: obj.buyOrSell ? 'Buy' : 'Sell',
        amount: obj.amount.toNumber(),
        peerID: obj.peerID,
        samePrice: '',
      };
    })
    .reverse();
  tableValidADs.bootstrapTable('load', data);
}

async function main() {
  const contract = await initContract();
  const validADs = await contract.getValidAdvertisements();
  const myValidADs = await contract.getValidAdvertisements(
    null,
    null,
    await signer0.getAddress()
  );
  fillMyADsTable(myValidADs);
  fillValidADsTable(validADs);

  buttonNewAD.onclick = async () => {
    const buyOrSell = inputADBuyOrSell.value === 'true';
    // TODO: Should change `AD.number` to `BN`?
    const amount = new BN(inputADAmount.value, 10);
    if (inputADPair.value === '') {
      // TODO: Notiy in the page
      throw new Error('Pair should not be empty');
    }
    if (inputADAmount.value === '') {
      // TODO: Notiy in the page
      throw new Error('Amount should not be empty');
    }
    if (inputADPeerID.value === '') {
      // TODO: Notiy in the page
      throw new Error('Peer ID should not be empty');
    }
    try {
      await contract.advertise({
        pair: inputADPair.value,
        buyOrSell: buyOrSell,
        amount: amount.toNumber(),
        peerID: inputADPeerID.value,
      });
      inputADPair.value = '';
      inputADBuyOrSell.value = '';
      inputADAmount.value = '';
      inputADPeerID.value = '';
    } catch (e) {
      // TODO: Notiy in the page
      throw e;
    }
    // TODO:
    //  Refresh table MyADs in a few seconds?
    //  Probably do it with ws.
  };
}

main();

/**
 * Data events for `tableMyADs`.
 */

(window as any).tableMyADsOperateFormatter = (
  value: any,
  row: any,
  index: any
) => {
  return `
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">Price</span>
    </div>
    <input type="text" id="myADsSMPListenPrice_${row.adID}" aria-label="price" class="form-control" place>
    <div class="input-group-append">
      <button class="btn btn-secondary" id="myADsSMPListenButton_${row.adID}">Listen</button>
    </div>
  </div>
  `;
};

const buttonListen = 'Listen';
const buttonUnlisten = 'Unlisten';

(window as any).tableMyADsOperateEvents = {
  'click .btn': async (e: any, value: any, row: any, index: any) => {
    const priceInput = document.querySelector(
      `input#myADsSMPListenPrice_${row.adID}`
    ) as HTMLInputElement;
    const button = document.querySelector(
      `button#myADsSMPListenButton_${row.adID}`
    ) as HTMLButtonElement;
    const peerID = row.peerID;
    if (button.innerHTML === buttonListen) {
      if (mapListeningPeers.has(peerID)) {
        throw new Error(`peer ID is already listened: peerID=${peerID}`);
      }
      priceInput.disabled = true;
      button.disabled = true;

      const peerInstance = new SMPPeer(priceInput.value, peerID);
      try {
        await peerInstance.connectToPeerServer();
      } catch (e) {
        priceInput.disabled = false;
        button.disabled = false;
        throw e;
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
      throw new Error(`unrecognized button innerHTML: ${button.innerHTML}`);
    }
  },
};

/**
 * Data events for `tableValidADs`.
 */
(window as any).tableValidADsOperateFormatter = (
  value: any,
  row: any,
  index: any
) => {
  return `
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">Price</span>
    </div>
    <input type="text" id="adsSMPPrice_${row.adID}" aria-label="price" class="form-control" place>
    <div class="input-group-append">
      <button class="btn btn-secondary" id="buttonRun">Run</button>
    </div>
  </div>
  `;
};

(window as any).tableValidADsOperateEvents = {
  'click .btn': async (e: any, value: any, row: any, index: any) => {
    const priceInput = document.querySelector(
      `input#adsSMPPrice_${row.adID}`
    ) as HTMLInputElement;
    const peerInstance = new SMPPeer(priceInput.value, undefined);
    await peerInstance.connectToPeerServer();
    const result = await peerInstance.runSMP(row.peerID);
    tableValidADs.bootstrapTable('updateRow', {
      index: index,
      row: {
        adID: row.adID,
        pair: row.pair,
        buyOrSell: row.buyOrSell,
        amount: row.amount,
        peerID: row.peerID,
        samePrice: result,
      },
    });
  },
};
