import $ from 'jquery';
import BN from 'bn.js';
import { ethers } from 'ethers';
import SMPPeer from 'js-smp-peer';

import 'bootstrap';
import 'bootstrap-table';

import { v4 as uuidv4 } from 'uuid';

import { networkConfig } from './config';
import { PeekABookContract } from './peekABookContract';

const tableMyADs = $('#tableMyIDs');
const tableAllADs = $('#tableAllADs');
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
const topBar = document.querySelector('div#topBar') as HTMLDivElement;

const mapListeningPeers = new Map<string, SMPPeer>();

function emitToplevelError(errMsg: string) {
  topBar.innerHTML = `
  <div class="alert alert-danger" role="alert">
    ${errMsg}
  </div>`;
  throw new Error(errMsg);
}

let contract: PeekABookContract;

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
      };
    })
    .reverse();
  tableAllADs.bootstrapTable('load', data);
}

async function main() {
  if (typeof (window as any).ethereum === undefined) {
    emitToplevelError('Metamask is required');
  }
  const ethereum = (window as any).ethereum;
  if (!ethereum.isMetaMask) {
    emitToplevelError('Metamask is required');
  }
  ethereum.autoRefreshOnNetworkChange = false;
  await ethereum.enable();
  ethereum.on('networkChanged', () => {
    window.location.reload();
  });
  ethereum.on('accountsChanged', () => {
    window.location.reload();
  });
  const provider = new ethers.providers.Web3Provider(ethereum);
  const networkName = (await provider.getNetwork()).name;
  const config = networkConfig[networkName];
  if (config === undefined) {
    const supportedNetowrks = [];
    for (const n in networkConfig) {
      supportedNetowrks.push(n);
    }
    const supportedNetworksStr = supportedNetowrks.join(', ');
    emitToplevelError(
      `Metamask: network \`${networkName}\` is not supported. ` +
        `Please switch to the supported networks=[${supportedNetworksStr}]`
    );
  }
  const signer0 = provider.getSigner(0);
  const contractJSON = require('../../build/contracts/PeekABook.json');
  const contractInstance = new ethers.Contract(
    config.contractAddress,
    contractJSON.abi,
    signer0
  );
  contract = new PeekABookContract(provider, contractInstance, {
    fromBlock: config.contractAtBlock,
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

function getRandomPeerID(): string {
  return uuidv4();
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
  try {
    await contract.advertise({
      pair: inputADPair.value,
      buyOrSell: buyOrSell,
      amount: amount.toNumber(),
      peerID: getRandomPeerID(),
    });
    inputADPair.value = '';
    inputADBuyOrSell.value = '';
    inputADAmount.value = '';
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
 * Data events for `tableAllADs`.
 */
(window as any).tableAllADsOperateFormatter = (
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

(window as any).tableAllADsOperateEvents = {
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
    tableAllADs.bootstrapTable('updateRow', {
      index: index,
      row: {
        adID: row.adID,
        pair: row.pair,
        buyOrSell: row.buyOrSell,
        amount: row.amount,
        peerID: row.peerID,
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

Promise.resolve(main())
  .then()
  .catch((e) => {
    throw e;
  });
