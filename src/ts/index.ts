import $ from 'jquery';

import { ethers } from 'ethers';
import SMPPeer from 'js-smp-peer';
import { ServerUnconnected } from 'js-smp-peer/lib/exceptions';

import 'bootstrap';
import 'bootstrap-table';

import { contractAtBlock, contractAddress } from './config';
import { AdvertiseLog, PeekABookContract } from './peekABookContract';


const validADsDOMID = 'tableValidADs';

const tableValidADs = $(`#${validADsDOMID}`);

const tableListeningPeerIDs = $('#tableListeningPeerIDs');
const buttonAddPeerID = $('#buttonAddPeerID');
const inputListeningPeerIDsPeerID = document.querySelector('input#inputListeningPeerIDsPeerID') as HTMLInputElement;
const inputListeningPeerIDsPrice = document.querySelector('input#inputListeningPeerIDsPrice') as HTMLInputElement;

const mapListeningPeers = new Map<string, SMPPeer>();

declare const web3: any;

const contractJSON = require('../../build/contracts/PeekABook.json');
const provider = new ethers.providers.Web3Provider(web3.currentProvider);
const signer0 = provider.getSigner(0);

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

function fillValidADsTable(logs: AdvertiseLog[]) {
  const data = logs.map(obj => {
    return {
      adID: obj.adID.toNumber(),
      pair: obj.pair,
      buyOrSell: obj.buyOrSell ? 'Buy' : 'Sell',
      amount: obj.amount.toNumber(),
      peerID: obj.peerID,
      samePrice: ''
    };
  }).reverse();
  tableValidADs.bootstrapTable("load", data);
}

async function getInfoFromContract() {
  const contract = await initContract();
  const validADs = await contract.getValidAdvertisements();
  fillValidADsTable(validADs);
}

getInfoFromContract();

/**
 * Register buttons
 */
$(function() {
  buttonAddPeerID.click(async () => {
    // TODO: Display if there is any error.
    if (inputListeningPeerIDsPrice.value === '') {
      throw new Error(`price cannout be empty`);
    }
    // `peerID` can be empty, which means we want the server to generate one for us.
    let peerID: string | undefined = inputListeningPeerIDsPeerID.value;
    if (peerID === '') {
      peerID = undefined;
    }
    if (peerID !== undefined && mapListeningPeers.has(peerID)) {
      throw new Error(`\`peerID\` already added: peerID=${peerID}`);
    }

    const price = inputListeningPeerIDsPrice.value;
    const peerInstance = new SMPPeer(price, peerID);
    await peerInstance.connectToPeerServer();
    // Finished connecting to the peer server. Now, we can safely add the peer in the map.
    const newPeerID = peerInstance.id;
    mapListeningPeers.set(newPeerID, peerInstance);
    const data = {
      peerID: newPeerID,
      price: price,
    }
    tableListeningPeerIDs.bootstrapTable('append', [data]);
    // Reset the inputs
    inputListeningPeerIDsPeerID.value = '';
    inputListeningPeerIDsPrice.value = '';
  });
});

/**
 * Data events for `tableListeningPeerIDs`.
 */
(<any>window).tableListeningPeerIDsOperateFormatter = (_: any, __: any, ___: any) => {
  return [
    '<a class="remove" href="javascript:void(0)" title="Remove">',
    '<i class="fa fa-trash"></i>',
    '</a>'
  ].join('');
};

(<any>window).tableListeningPeerIDsOperateEvents = {
  'click .remove': function (e: any, value: any, row: any, index: any) {
    const peerID: string = row.peerID;
    const peerInstance = mapListeningPeers.get(peerID);
    if (peerInstance === undefined) {
      throw new Error(
        `peerID=${peerID} is not found in \`mapListeningPeers\` ` +
        'but it is in the table. something is wrong.'
      );
    }
    // Remove the entry anyway.
    tableListeningPeerIDs.bootstrapTable('remove', {
      field: 'peerID',
      values: [peerID]
    });
    mapListeningPeers.delete(peerID);
    try {
      peerInstance.disconnect();
    } catch (e) {
      if (e instanceof ServerUnconnected) {
        // Ignore it.
      } else {
        throw e;
      }
    }
  }
};


/**
 * Data events for `tableValidADs`.
 */
(<any>window).tableValidADsOperateFormatter = (value: any, row: any, index: any) => {
  // return '<a class="run" href="javascript:void(0)" value=\'value\'>Run</a>';
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

(<any>window).tableValidADsOperateEvents = {
  'click .btn': async (e: any, value: any, row: any, index: any) => {
    const priceInput = document.querySelector(`input#adsSMPPrice_${row.adID}`) as HTMLInputElement;
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
      }
    })
  }
};
