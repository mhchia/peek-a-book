import Peer from 'peerjs';

import { SMPStateMachine } from 'js-smp';
import { TLV } from 'js-smp/lib/msgs';

import { defaultServerConfig } from './config';

const localPeerParamName = 'localPeer';
const localPeerID = localPeerParamName;
const remotePeerParamName = 'remotePeer';
const remotePeerID = remotePeerParamName;
const secretParamName = 'secret';
const secretID = secretParamName;
const startButtonID = 'startButton';
const connectButtonID = 'connectButton';

let localPeer: Peer;
let conn: Peer.DataConnection;
const peerConfig = defaultServerConfig;
const timeSleep = 10;

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

function startPeer() {
  localPeer = new Peer(localPeerElement.value, peerConfig);
  // Emitted when a connection to the PeerServer is established.
  localPeer.on('open', onConnectedToPeerServer);
  // Emitted when a new data connection is established from a remote peer.
  localPeer.on('connection', (conn: Peer.DataConnection) => {
    // A remote peer has connected us!
    console.log(`Received a connection from ${conn.peer}`);

    // Emitted when the connection is established and ready-to-use.
    // Ref: https://peerjs.com/docs.html#dataconnection
    conn.on('open', async () => {
      const stateMachine = new SMPStateMachine(secretElement.value);

      // Emitted when either you or the remote peer closes the data connection.
      // Not supported by Firefox.
      // conn.on('close', () => {});
      // Emitted when error occurs.
      // conn.on('error', () => {});
      // Emitted when data is received from the remote peer.
      conn.on('data', createConnDataHandler(stateMachine, conn));
      // TODO: Add `timeout`
      await waitUntilTrue(stateMachine.isFinished.bind(stateMachine));
      console.log(
        `Finished SMP with ${conn.peer}: result=${stateMachine.getResult()}`
      );
    });
  });
}

function connectRemotePeer() {
  if (localPeer === null) {
    throw new Error("localPeer hasn't been initialized");
  }
  conn = localPeer.connect(remotePeerElement.value, { reliable: true });
  console.log(`Connecting ${remotePeerElement.value}...`);
  conn.on('open', async () => {
    console.log(`Connection to ${conn.peer} is ready.`);

    const stateMachine = new SMPStateMachine(secretElement.value);
    const firstMsg = stateMachine.transit(null);
    if (firstMsg === null) {
      throw new Error('msg1 should not be null');
    }
    conn.on('data', createConnDataHandler(stateMachine, conn));
    conn.send(firstMsg.serialize());
    // TODO: Add `timeout`
    await waitUntilTrue(stateMachine.isFinished.bind(stateMachine));
    console.log(
      `Finished SMP with ${conn.peer}: result=${stateMachine.getResult()}`
    );
  });
}

function onConnectedToPeerServer(id: string) {
  console.log(`Connected to the peer server: our ID is ${id}`);
}

function createConnDataHandler(
  stateMachine: SMPStateMachine,
  conn: Peer.DataConnection
) {
  return (data: ArrayBuffer) => {
    const tlv = TLV.deserialize(new Uint8Array(data));
    const replyTLV = stateMachine.transit(tlv);
    if (replyTLV === null) {
      return;
    }
    conn.send(replyTLV.serialize());
  };
}

/* Utility functions */

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function waitUntilTrue(conditionChecker: () => boolean): Promise<void> {
  while (!conditionChecker()) {
    await sleep(timeSleep);
  }
}

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
