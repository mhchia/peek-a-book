# peek-a-book
> A typescript implementation of [PeekABook][peek_a_book], a private order matching system proposed by Barry Whitehat and Kobi Gurkan.

## What is PeekABook?
PeekABook is a private order matching system, which allows users to advertise and search for trading orders without leaking the price of the orders.

- Privacy: the privacy of price information is achieved with the [solution][smp_paper] to [Socialist Millionaire Problem][smp_wiki]. More details about the protocol can be found in [`js-smp`][js-smp].
- Communication: users run SMP(Socialist Millionaire Protocol) with each other through [WebRTC][webrtc]. Users can easily establish peer-to-peer connection without worrying about NAT and other issues. All of the annoying things are handled by WebRTC. Our WebRTC connections are powered by [`PeerJS`][peerjs].

<!-- TODO: Contract -->

## Setup
Install the library with npm
```bash
npm install peek-a-book
```

## Usage

### SMPPeer
`SMPPeer` is the core logic of PeekABook. It is used to initiate SMP requests and also handles them.

#### Connecting to the peer server and run SMP with a peer
```typescript
import SMPPeer from 'peek-a-book';

async function main() {
    // Secret is a plain string.
    const secret: string = 'my-secret';
    // Peer ID is a plain string as well.
    const peerID: string = 'my-peer-id';
    // Create a `SMPPeer` with `secret` and `peerID`.
    const peer = new SMPPeer(secret, peerID);
    // Or you can omit `peerID`. The peer server will choose a uuid when connected to it.
    const peer = new SMPPeer(secret);
    // Connect to the peer server, to contact or be contacted with the other peers.
    await peer.connectToPeerServer();

    // Run SMP with the peer whose id is "another-peer".
    const anotherPeer = 'another-peer';
    const result: boolean = await peer.runSMP(anotherPeer);
    console.log(`Finished running SMP with peer ${anotherPeer}, result=${result}`);
}

main();
```

### Peer server
A Peer server is in charge of making peers capable of discovering each others and exchanging necessary data used to establish WebRTC connections. We can even disconnect from the peer server after a connection is successfully established. We use the [`PeerServer`][peerjs_server] supported by [`PeerJS`][peerjs]. Check out [`PeerServer`][peerjs_server] for more information.

By default, `SMPPeer` connects to the one specified in `defaultPeerConfig` in `src/config.ts`. You can connect to other peer servers by specifying a config when initializing `SMPPeer`.

```typescript
const customConfig = {
  host: 'my-server'
  port: 5566,
  path: '/myapp',
  secure: true,
};
const peer = new SMPPeer(secret, peerID, customConfig);
```

## Demo
https://mhchia.github.io/peek-a-book/


[peerjs]: https://github.com/peers/peerjs
[peerjs_server]: https://github.com/peers/peerjs-server
[peek_a_book]: https://ethresear.ch/t/peekabook-private-order-matching/6987
[smp_wiki]: https://en.wikipedia.org/wiki/Socialist_millionaires
[smp_paper]: https://www.win.tue.nl/~berry/papers/dam.pdf
[js_smp]: https://github.com/mhchia/js-smp
[webrtc]: https://webrtc.org
