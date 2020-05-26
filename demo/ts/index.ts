import SMPPeer from '../../src/smpPeer';

const localPeerParamName = 'localPeer';
const localPeerDOMID = localPeerParamName;
const remotePeerParamName = 'remotePeer';
const remotePeerDOMID = remotePeerParamName;
const secretParamName = 'secret';
const secretDOMID = secretParamName;
const startButtonDOMID = 'startButton';
const connectButtonDOMID = 'connectButton';

let localPeer: SMPPeer;

const localPeerElement = setTextareaValueWithParam(localPeerDOMID, localPeerParamName);
const remotePeerElement = setTextareaValueWithParam(remotePeerDOMID, remotePeerParamName);
const secretElement = setTextareaValueWithParam(secretDOMID, secretParamName);
const startButton = document.querySelector(`button#${startButtonDOMID}`) as HTMLButtonElement;
const connectButton = document.querySelector(`button#${connectButtonDOMID}`) as HTMLButtonElement;

startButton.onclick = startPeer;
connectButton.onclick = runSMP;
secretElement.onchange = updateSecret;

async function startPeer() {
  // TODO: Reconnect whenever the peer id is changed, and report if connected on the page.
  localPeer = new SMPPeer(secretElement.value);
  await localPeer.connectToPeerServer(getLocalPeerID());
  localPeerElement.value = localPeer.id;
}

async function runSMP() {
  // TODO: Update HTML if remote id is empty
  const remotePeerID = getRemotePeerID();
  const result = await localPeer.runSMP(remotePeerID);
  console.log(`Finished SMP with peer=${remotePeerID}: result=${result}`);
}

function updateSecret() {
  if (localPeer !== undefined) {
    localPeer.secret = secretElement.value;
  }
}

/* Utility functions */

function getLocalPeerID(): string | undefined {
  if (localPeerElement.value === '') {
    // Let the peer server generate for us
    return undefined;
  }
  return localPeerElement.value;
}

function getRemotePeerID(): string {
  if (remotePeerElement.value === '') {
    throw new Error('remote peer id is empty');
  } else {
    return remotePeerElement.value;
  }
}

function getGETParam(q: string): string {
  const t = (window.location.search.match(new RegExp(`[?&]${q}=([^&]+)`)) || [, null])[1];
  if (t === null || t === undefined) {
    return '';
  }
  return t;
}

function setTextareaValueWithParam(id: string, paramName: string): HTMLTextAreaElement {
  const element = document.querySelector(`textarea#${id}`) as HTMLTextAreaElement;
  if (element === null) {
    throw new Error(`couldn't get element ${id}`);
  }
  element.value = getGETParam(paramName);
  return element;
}
