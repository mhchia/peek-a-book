import $ from 'jquery';
import BN from 'bn.js';
import { ethers } from 'ethers';
import SMPPeer from 'js-smp-peer';

import 'bootstrap';
import 'bootstrap-table';

import { v4 as uuidv4 } from 'uuid';

import { TNetworkConfig, networkConfig, peerServerGetPeersURL } from './config';
import { PeekABookContract, AdvertiseLog } from './peekABookContract';

const pollPeersInterval = 1000;
const updateOnlinePeriod = 500;

let config: TNetworkConfig;

// Enable tooltips
$(function () {
  $('[data-toggle="tooltip"]').tooltip();
});

const tableMyADs = $('#tableMyIDs');
const tableAllADs = $('#tableAllADs');
const tableSMPHistory = $('#tableSMPHistory');

const spinnerHTML = `
<div class="spinner-border spinner-border-sm" role="status">
  <span class="sr-only">Loading...</span>
</div>`;
const matchButtonName = 'Match';

const buttonNewAD = document.querySelector(
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
const topBar = document.querySelector('div#topBar') as HTMLDivElement;
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

// Buy ETH/USDT = Buy `amount(ETH)` `ETH` with `USDT` at `price(USDT)`
// Sell ETH/USDT = Sell `amount(ETH)` `ETH` for `USDT` at `price(USDT)`
// Buy X with Y amount using currency Z -> Pair XZ, amount Y, price A per
const erc20TokenList = require('./erc20_tokens.json') as string[][];

erc20TokenList.forEach((item) => {
  const fullname = item[0];
  const abbreviation = item[1];
  const option = document.createElement('option') as HTMLOptionElement;
  option.text = fullname;
  option.value = abbreviation;
  dataListERC20Token.appendChild(option);
});

const mapListeningPeers = new Map<string, SMPPeer>();

function emitError(errMsg: string) {
  topBar.innerHTML = `
  <div class="alert alert-danger alert-dismissible fade show" role="alert">
    ${errMsg}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>`;
  throw new Error(errMsg);
}

function emitNotification(msg: string) {
  topBar.innerHTML = `
  <div class="alert alert-success alert-dismissible fade show" role="alert">
    ${msg}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>`;
}

async function getPeers() {
  const t1 = performance.now();
  const fetched = await fetch(peerServerGetPeersURL);
  console.debug(`Spent ${performance.now() - t1} on fetching online peers`);
  const parsed = await fetched.json();
  return new Set(parsed as string[]);
}

let onlinePeers: Set<string>;

async function startPollingOnlinePeers() {
  onlinePeers = await getPeers();
  setInterval(async () => {
    onlinePeers = await getPeers();
  }, pollPeersInterval);
}

let contract: PeekABookContract;

const splitter = '/';

function getPairName(currency1: string, currency2: string): string {
  return `${currency1}${splitter}${currency2}`;
}

function getCurrenciesByPairName(pairName: string): string[] {
  const currencyArr = pairName.split(splitter);
  if (currencyArr.length !== 2) {
    throw new Error(
      `invalid pair name: ${pairName} should be splitted by \`${splitter}\``
    );
  }
  return currencyArr;
}

function preprocessADs(ads: AdvertiseLog[]) {
  const reversed = ads.reverse();
  const res = [];
  for (const ad of reversed) {
    try {
      const curs = getCurrenciesByPairName(ad.pair);
      res.push({
        adID: ad.adID.toNumber(),
        currency1: curs[0],
        currency2: curs[1],
        buyOrSell: ad.buyOrSell,
        amount: ad.amount.toNumber(),
        peerID: ad.peerID,
      });
    } catch (e) {
      // Ignore invalid pair names
      continue;
    }
  }
  return res;
}

function getInputPriceExplanation(
  currency1: string,
  currency2: string
): string {
  return `Price(# ${currency2} per ${currency1})`;
}

async function updateMyADsTable(contract: PeekABookContract, myAddr: string) {
  const myValidADs = await contract.getValidAdvertisements(null, null, myAddr);
  const data = preprocessADs(myValidADs);
  tableMyADs.bootstrapTable('load', data);
}

function updateValidADsTablePriceMatching(
  peerID: string,
  adID: number,
  currency1: string,
  currency2: string
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

let timeoutID: NodeJS.Timeout | undefined;

async function updateValidADsTable(contract: PeekABookContract) {
  // Remove the previous timer if any because we are setting up a new one later in this function.
  if (timeoutID !== undefined) {
    clearInterval(timeoutID);
  }
  // Automatically update online/offline after the table is loaded with data
  // NOTE: `onLoadSuccess`(load-success.bs.table)[https://bootstrap-table.com/docs/api/events/#onloadsuccess]
  //  is not working somehow. Use `onPostBody` instead.
  tableAllADs.on('post-body.bs.table', function (event, data) {
    tableAllADs.off('post-body.bs.table');
    timeoutID = setInterval(() => {
      const tS = performance.now();
      for (const index in data) {
        const ad = data[index];
        updateValidADsTablePriceMatching(
          ad.peerID,
          ad.adID,
          ad.currency1,
          ad.currency2
        );
      }
      console.debug(
        `Spent ${performance.now() - tS} ms on updating all online status ` +
          'for table "All Advertisements"'
      );
    }, updateOnlinePeriod);
  });

  const validADs = await contract.getValidAdvertisements();
  const data = preprocessADs(validADs);
  tableAllADs.bootstrapTable('load', data);
}

async function main() {
  if ((window as any).ethereum === undefined) {
    emitError('Metamask is required');
  }
  const ethereum = (window as any).ethereum;
  if (!ethereum.isMetaMask) {
    emitError('Metamask is required');
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
  config = networkConfig[networkName];
  if (config === undefined) {
    const supportedNetowrks = [];
    for (const n in networkConfig) {
      supportedNetowrks.push(n);
    }
    const supportedNetworksStr = supportedNetowrks.join(', ');
    emitError(
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
  await startPollingOnlinePeers();
  await updateMyADsTable(contract, await signer0.getAddress());
  await updateValidADsTable(contract);
  tableSMPHistory.bootstrapTable({});
}

function addSMPRecord(
  isInitiator: boolean,
  localPeerID: string,
  remotePeerID: string,
  adID: number,
  price: string,
  result: boolean
) {
  const data = {
    initiator: isInitiator ? 'You' : 'Others',
    localPeerID: localPeerID,
    remotePeerID: remotePeerID,
    adID: adID,
    price: price,
    result: result,
    timestamp: new Date().toUTCString(),
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
  if (inputCurrency1.value === '') {
    emitError('`Currency1` should not be empty');
  }
  if (inputCurrency2.value === '') {
    emitError('`Currency2` should not be empty');
  }
  if (inputADAmount.value === '') {
    emitError('`Amount` should not be empty');
  }
  const pairName = getPairName(inputCurrency1.value, inputCurrency2.value);
  try {
    const tx = await contract.advertise({
      pair: pairName,
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
};

/**
 * Data events for `tableMyADs`.
 */

(window as any).tableMyADsOperateFormatter = (
  value: any,
  row: any,
  index: any
) => {
  const tooltips = getInputPriceExplanation(row.currency1, row.currency2);
  return `
  <div class="input-group" data-toggle="tooltip" data-placement="top" title="${tooltips}">
    <input type="number" min="1" id="myADsSMPListenPrice_${row.adID}" placeholder="${tooltips}" aria-label="price" class="form-control" place>
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
    const price = priceInput.value;
    if (price === '') {
      emitError('`Price` should not be empty');
    }
    const button = document.querySelector(
      `button#myADsSMPListenButton_${row.adID}`
    ) as HTMLButtonElement;
    const peerID = row.peerID;
    if (button.innerHTML === buttonListen) {
      if (mapListeningPeers.has(peerID)) {
        emitError(`Peer ID is already listened: peerID=${peerID}`);
      }
      priceInput.disabled = true;
      button.disabled = true;

      const peerInstance = new SMPPeer(price, peerID);
      peerInstance.on('incoming', (remotePeerID: string, result: boolean) => {
        emitNotification(
          `Finished outgoing price matching with advertisement #${row.adID}: ` +
            `price=${price}, result=${result}`
        );
        addSMPRecord(
          false,
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
  },
};

(window as any).tableMyADsDeleteOperateFormatter = (
  value: any,
  row: any,
  index: any
) => {
  return [
    '<a class="remove" href="javascript:void(0)" title="Remove">',
    '<i class="fa fa-trash text-danger"></i>',
    '</a>',
  ].join('');
};

(window as any).tableMyADsDeleteOperateEvents = {
  'click .remove': async (e: any, value: any, row: any, index: any) => {
    try {
      const tx = await contract.invalidate(row.adID);
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
  },
};

/**
 * Data events for `tableAllADs`.
 */


(window as any).adsDescriptionFormatter = (
  value: any,
  row: any,
  index: any
) => {
  let buyOrSell: string;
  if (row.buyOrSell) {
    buyOrSell = '<span class="text-success"><strong>buying</strong></span>';
  } else {
    buyOrSell = '<span class="text-danger"><strong>selling</strong></span>';
  }
  const withOrFor: string = row.buyOrSell ? 'with' : 'for';
  return `Advertiser <strong>${row.adID}</strong> is ${buyOrSell} <strong>${row.amount}</strong> <strong>${row.currency1}</strong> ${withOrFor} <strong>${row.currency2}</strong>`;
};

(window as any).tableAllADsOperateFormatter = (
  value: any,
  row: any,
  index: any
) => {
  const tooltips = getInputPriceExplanation(row.currency1, row.currency2);
  return `
  <div class="input-group" data-toggle="tooltip" data-placement="top" title="${tooltips}">
    <input type="number" min="1" id="adsSMPPrice_${row.adID}" placeholder="${tooltips}" aria-label="price" class="form-control" place>
    <div class="input-group-append">
      <button class="btn btn-secondary" id="buttonRun_${row.adID}">${matchButtonName}</button>
    </div>
  </div>
  `;
};

(window as any).tableAllADsOperateEvents = {
  'click .btn': async (e: any, value: any, row: any, index: any) => {
    const priceInput = document.querySelector(
      `input#adsSMPPrice_${row.adID}`
    ) as HTMLInputElement;
    const price = priceInput.value;
    if (price === '') {
      emitError('`Price` should not be empty');
    }
    const button = document.querySelector(
      `button#buttonRun_${row.adID}`
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
      const remotePeerID = row.peerID;
      const result = await peerInstance.runSMP(remotePeerID);
      // Since we already get the result, close the peer instance.
      peerInstance.disconnect();
      emitNotification(
        `Finished matching price with advertisement #${row.adID}: price=${price}, result=${result}`
      );
      addSMPRecord(true, localPeerID, row.peerID, row.adID, price, result);
    } catch (e) {
      emitError(`Failed to match with the advertiser: ${e}`);
    } finally {
      // Recover the disabled button and input
      button.innerHTML = matchButtonName;
      button.disabled = false;
      priceInput.disabled = false;
    }
  },
};

Promise.resolve(main())
  .then()
  .catch((e) => {
    emitError(e);
  });
