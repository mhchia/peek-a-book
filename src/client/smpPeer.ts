import Peer from 'peerjs';

import { SMPStateMachine } from 'js-smp';
import { TLV } from 'js-smp/lib/msgs';

import { defaultPeerConfig } from '../config';

type TPeerID = string;

const timeSleep = 10;

class SMPPeer {
  peer?: Peer;
  conns: Map<TPeerID, Peer.DataConnection>;

  constructor(
    readonly secret: string,
    readonly localPeerID?: TPeerID,
    readonly peerConfig = defaultPeerConfig,
  ) {
    this.conns = new Map();
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
        console.log(
          `Finished SMP with ${conn.peer}: result=${stateMachine.getResult()}`
        );
        // TODO: Add `close` event
      });
    });
    // Wait until connected to the peer server
    const _connectToServer = async() => {
      return new Promise((resolve, reject) => {
        // Emitted when a connection to the PeerServer is established.
        localPeer.on('open', (id: any) => {
          resolve(id);
          this.peer = localPeer;
        });
      });
    }
    await _connectToServer();
  }

  async connectRemotePeer(remotePeerID: TPeerID) {
    if (this.peer === undefined) {
      // TODO: Add exceptions
      throw new Error("need to be connected to a peer server to discover other peers");
    }
    const conn = this.peer.connect(remotePeerID, { reliable: true });
    console.log(`Connecting ${remotePeerID}...`);
    conn.on('open', async () => {
      console.log(`Connection to ${conn.peer} is ready.`);

      const stateMachine = new SMPStateMachine(this.secret);
      const firstMsg = stateMachine.transit(null);
      if (firstMsg === null) {
        throw new Error('msg1 should not be null');
      }
      conn.on('data', createConnDataHandler(stateMachine, conn));
      conn.send(firstMsg.serialize());
      // TODO: Add `timeout`
      await waitUntilStateMachineFinished(stateMachine);
      console.log(
        `Finished SMP with ${conn.peer}: result=${stateMachine.getResult()}`
      );
    });
  }

  // TODO: Add disconnet peer server
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

async function waitUntilStateMachineFinished(stateMachine: SMPStateMachine): Promise<void> {
  while (!stateMachine.isFinished()) {
    await sleep(timeSleep);
  }
}

export { SMPPeer };
