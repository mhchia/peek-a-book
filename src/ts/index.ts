import { ethers } from 'ethers';

import 'bootstrap';
import 'bootstrap-table';

import { networkConfig, TNetworkConfig } from './configs';
import { PeekABookContract } from './peekABookContract';

import { emitError, getRowDescription } from './utils';

import {
  updateAllADsTable,
  tableAllADsMatchFormatter,
  tableAllADsMatchCB,
} from './tableAllADs';
import {
  updateMyADsTable,
  buttonNewAD,
  cbButtonNewAD,
  tableMyADsListenFormatter,
  tableMyADsListenButtonCB,
  tableMyADsDeleteFormatter,
  tableMyADsDeleteCB,
} from './tableMyADs';
import { initializeMatchingHistoryTable } from './tableMatchingHistory';

let contract: PeekABookContract;
let config: TNetworkConfig;

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

  await updateMyADsTable(contract, await signer0.getAddress());
  await updateAllADsTable(contract);
  initializeMatchingHistoryTable();
}

/** Register formatters */
(window as any).adsDescriptionFormatter = (
  value: any,
  row: any,
  index: any
) => {
  return getRowDescription(
    row.adID,
    row.buyOrSell,
    row.amount,
    row.currency1,
    row.currency2
  );
};

(window as any).tableMyADsListenFormatter = (
  value: any,
  row: any,
  index: any
) => {
  return tableMyADsListenFormatter(row.adID, row.currency1, row.currency2);
};

(window as any).tableMyADsDeleteFormatter = (
  value: any,
  row: any,
  index: any
) => {
  return tableMyADsDeleteFormatter();
};

(window as any).tableAllADsMatchFormatter = (
  value: any,
  row: any,
  index: any
) => {
  return tableAllADsMatchFormatter(row.adID, row.currency1, row.currency2);
};

/** Register event handlers */
buttonNewAD.onclick = () => {
  cbButtonNewAD(contract, config);
};

(window as any).tableMyADsListenEvents = {
  'click .btn': async (e: any, value: any, row: any, index: any) => {
    tableMyADsListenButtonCB(row.adID, row.peerID);
  },
};

(window as any).tableMyADsDeleteEvents = {
  'click .remove': async (e: any, value: any, row: any, index: any) => {
    tableMyADsDeleteCB(contract, config, row.adID);
  },
};

(window as any).tableAllADsMatchEvents = {
  'click .btn': async (e: any, value: any, row: any, index: any) => {
    tableAllADsMatchCB(row.adID, row.peerID);
  },
};

Promise.resolve(main())
  .then()
  .catch((e) => {
    emitError(e);
  });
