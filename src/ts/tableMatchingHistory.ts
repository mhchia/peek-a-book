import $ from 'jquery';
import { BigNumber } from 'ethers/utils';

const tableMatchingHistory = $('#tableMatchingHistory');

export function initializeMatchingHistoryTable() {
  tableMatchingHistory.bootstrapTable({});
}

export function addMatchingRecord(
  isInitiator: boolean,
  localPeerID: string,
  remotePeerID: string,
  adID: BigNumber,
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
  tableMatchingHistory.bootstrapTable('append', [data]);
}
