import Peer from 'peerjs';

import { SMPStateMachine } from 'js-smp';
import { TLV } from 'js-smp/lib/msgs';

import { defaultPeerConfig } from './config';
import { ServerUnconnected } from './exceptions';

const timeSleep = 10;

function createConnDataHandler(stateMachine: SMPStateMachine, conn: Peer.DataConnection) {
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

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function waitUntilStateMachineFinished(stateMachine: SMPStateMachine): Promise<void> {
  while (!stateMachine.isFinished()) {
    await sleep(timeSleep);
  }
}

class SMPPeer {
  secret: string;

  private peer?: Peer;

  constructor(secret: string, readonly localPeerID?: string, readonly peerConfig = defaultPeerConfig) {
    this.secret = secret;
  }

  get id(): string {
    if (this.peer === undefined) {
      throw new ServerUnconnected('need to be connected to a peer server to discover other peers');
    }
    return this.peer.id;
  }

  async connectToPeerServer(): Promise<void> {
    const localPeer = new Peer(this.localPeerID, this.peerConfig);

    // Emitted when a new data connection is established from a remote peer.
    localPeer.on('connection', (conn: Peer.DataConnection) => {
      // A remote peer has connected us!
      console.log(`Received a connection from ${conn.peer}`);

      // Emitted when the connection is established and ready-to-use.
      // Ref: https://peerjs.com/docs.html#dataconnection
      conn.on('open', async () => {
        const stateMachine = new SMPStateMachine(this.secret);

        // Emitted when either you or the remote peer closes the data connection.
        // Not supported by Firefox.
        // conn.on('close', () => {});
        // Emitted when error occurs.
        // conn.on('error', () => {});
        // Emitted when data is received from the remote peer.
        conn.on('data', createConnDataHandler(stateMachine, conn));
        // TODO: Add `timeout`
        await waitUntilStateMachineFinished(stateMachine);
        console.log(`Finished SMP with peer=${conn.peer}: result=${stateMachine.getResult()}`);
        // TODO: Add `close` event
      });
    });
    // Wait until we are connected to the PeerServer
    await new Promise((resolve, reject) => {
      // Emitted when a connection to the PeerServer is established.
      localPeer.on('open', (id: string) => {
        // If we expect our PeerID to be `localPeerID` but the peer server returns another one,
        // we should be aware that something is wrong between us and the server.
        if (this.localPeerID !== undefined && id !== this.localPeerID) {
          reject(
            new Error(
              'the returned id from the peer server is not the one we expect: ' +
                `returned=${id}, expected=${this.localPeerID}`,
            ),
          );
        }
        resolve(id);
        this.peer = localPeer;
      });
    });
  }

  async runSMP(remotePeerID: string): Promise<boolean> {
    if (this.peer === undefined) {
      throw new ServerUnconnected('need to be connected to a peer server to discover other peers');
    }
    const conn = this.peer.connect(remotePeerID, { reliable: true });
    console.log(`Connecting ${remotePeerID}...`);
    const stateMachine = new SMPStateMachine(this.secret);
    conn.on('open', async () => {
      console.log(`Connection to ${conn.peer} is ready.`);
      const firstMsg = stateMachine.transit(null);
      // Sanity check
      if (firstMsg === null) {
        throw new Error('msg1 should not be null');
      }
      conn.on('data', createConnDataHandler(stateMachine, conn));
      conn.send(firstMsg.serialize());
      // TODO: Add `timeout`
    });
    await waitUntilStateMachineFinished(stateMachine);
    return stateMachine.getResult();
  }
}

export default SMPPeer;
