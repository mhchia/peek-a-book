import $ from 'jquery';

import BN from 'bn.js';
import { ethers } from 'ethers';
import SMPPeer from 'js-smp-peer';

import 'bootstrap';
import 'bootstrap-table';

import { contractAtBlock, contractAddress } from './config';
import { PeekABookContract } from './peekABookContract';

const tableMyADs = $('#tableMyIDs');
const tableValidADs = $('#tableValidADs');
const tableSMPHistory = $('#tableSMPHistory');

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
const topBar = document.querySelector('div#topBar') as HTMLDivElement;

const mapListeningPeers = new Map<string, SMPPeer>();

if ((window as any).ethereum === undefined) {
  topBar.innerHTML = `
<div class="alert alert-danger" role="alert">
  Metamask is required.
</div>`;
  throw new Error('Metamask is required');
}

const contractJSON = require('../../build/contracts/PeekABook.json');

let contract: PeekABookContract;
const ethereum = (window as any).ethereum;

async function fillMyADsTable(contract: PeekABookContract, myAddr: string) {
  const myValidADs = await contract.getValidAdvertisements(null, null, myAddr);
  const data = myValidADs
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

async function fillValidADsTable(contract: PeekABookContract) {
  const validADs = await contract.getValidAdvertisements();
  const data = validADs
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
  await ethereum.enable();
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer0 = provider.getSigner(0);
  const contractInstance = new ethers.Contract(
    contractAddress,
    contractJSON.abi,
    signer0
  );
  contract = new PeekABookContract(provider, contractInstance, {
    fromBlock: contractAtBlock,
  });
  await fillMyADsTable(contract, await signer0.getAddress());
  await fillValidADsTable(contract);
  tableSMPHistory.bootstrapTable({});
}

function addSMPRecord(
  inOrOut: 'in' | 'out',
  localPeerID: string,
  remotePeerID: string,
  adID: number,
  price: string,
  result: boolean
) {
  const data = {
    direction: inOrOut,
    localPeerID: localPeerID,
    remotePeerID: remotePeerID,
    adID: adID,
    price: price,
    result: result,
    timestamp: new Date().toISOString(),
  };
  tableSMPHistory.bootstrapTable('append', [data]);
}

buttonNewAD.onclick = async () => {
  const buyOrSell = inputADBuyOrSell.value === 'buy';
  // TODO: Should change `AD.number` to `BN`?
  const amount = new BN(inputADAmount.value, 10);
  if (inputADPair.value === '') {
    // TODO: Notify in the page
    throw new Error('pair should not be empty');
  }
  if (inputADAmount.value === '') {
    // TODO: Notify in the page
    throw new Error('amount should not be empty');
  }
  if (inputADPeerID.value === '') {
    // TODO: Notify in the page
    throw new Error('peer ID should not be empty');
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
    // TODO: Notify in the page
    throw e;
  }
  // TODO:
  //  Refresh table MyADs in a few seconds?
  //  Probably do it with ws.
};

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
      peerInstance.on('incoming', (remotePeerID: string, result: boolean) => {
        addSMPRecord(
          'in',
          peerID,
          remotePeerID,
          row.adID,
          priceInput.value,
          result
        );
      });
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

(window as any).tableMyADsDeleteOperateFormatter = (
  value: any,
  row: any,
  index: any
) => {
  return [
    '<a class="remove" href="javascript:void(0)" title="Remove">',
    '<i class="fa fa-trash"></i>',
    '</a>',
  ].join('');
};

(window as any).tableMyADsDeleteOperateEvents = {
  'click .remove': async (e: any, value: any, row: any, index: any) => {
    await contract.invalidate(row.adID);
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
    // Create a temporary `SMPPeer` to run SMP with the remote peer.
    const peerInstance = new SMPPeer(priceInput.value, undefined);
    await peerInstance.connectToPeerServer();
    const localPeerID = peerInstance.id;
    const remotePeerID = row.peerID;
    const result = await peerInstance.runSMP(remotePeerID);
    // Since we already get the result, close the peer instance.
    peerInstance.disconnect();
    // TODO: Add spinning waiting label
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
    addSMPRecord(
      'out',
      localPeerID,
      row.peerID,
      row.adID,
      priceInput.value,
      result
    );
  },
};

main();
