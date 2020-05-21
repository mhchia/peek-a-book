import Peer from 'peerjs';

import { SMPPeer } from './client/smpPeer';

const localPeerParamName = 'localPeer';
const localPeerID = localPeerParamName;
const remotePeerParamName = 'remotePeer';
const remotePeerID = remotePeerParamName;
const secretParamName = 'secret';
const secretID = secretParamName;
const startButtonID = 'startButton';
const connectButtonID = 'connectButton';

let localPeer: SMPPeer;

const localPeerElement = setTextareaValueWithParam(
  localPeerID,
  localPeerParamName
);
const remotePeerElement = setTextareaValueWithParam(
  remotePeerID,
  remotePeerParamName
);
const secretElement = setTextareaValueWithParam(secretID, secretParamName);
const startButton = document.querySelector(
  `button#${startButtonID}`
) as HTMLButtonElement;
const connectButton = document.querySelector(
  `button#${connectButtonID}`
) as HTMLButtonElement;

startButton.onclick = startPeer;
connectButton.onclick = connectRemotePeer;

async function startPeer() {
  localPeer = new SMPPeer(secretElement.value, localPeerElement.value);
  await localPeer.connectToPeerServer();
}

async function connectRemotePeer() {
  await localPeer.connectRemotePeer(remotePeerElement.value);
}

/* Utility functions */

function getGETParam(q: string): string {
  const t = (window.location.search.match(
    new RegExp('[?&]' + q + '=([^&]+)')
  ) || [, null])[1];
  if (t === null || t === undefined) {
    return '';
  } else {
    return t;
  }
}

function setTextareaValueWithParam(
  id: string,
  paramName: string
): HTMLTextAreaElement {
  const element = document.querySelector(
    `textarea#${id}`
  ) as HTMLTextAreaElement;
  if (element === null) {
    throw new Error(`couldn't get element ${id}`);
  }
  element.value = getGETParam(paramName);
  return element;
}
