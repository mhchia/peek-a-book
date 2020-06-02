<p align="center">
  <a href="https://github.com/mhchia/peek-a-book/actions?workflow=test"><img alt="GitHub Actions status" src="https://github.com/mhchia/peek-a-book/workflows/test/badge.svg"></a>
</p>

# peek-a-book
> A typescript implementation of [PeekABook][peek_a_book], a private order matching system proposed by Barry Whitehat and Kobi Gurkan.

## What is PeekABook?
`PeekABook` is a private order matching system on [Ethereum](https://en.wikipedia.org/wiki/Ethereum). It allows users to advertise and search for trading orders without leaking the order price.

To trade, users can either post an advertisement or search for existing advertisements on the smart contract. An advertisement consists of `({identity}, {sell or buy}, {pair_name}, {amount})`, which means user `identity` wants to either sell or buy `amount` units of pair `pair_name`. When a user `A` contacts an advertiser `B`, [SMP(Socialist Millionaire Problem) Protocol][smp_wiki] to let both `A` and `B` know whether they desire the same price. Thanks to the protocol, A and B will only know whether `priceA == priceB` is true or not. They won't learn any more than this fact. [`js-smp-peer`][js_smp_peer] is used to handle and initiate SMP protocol.

## Demo

https://mhchia.github.io/peek-a-book/

<!-- TODO: More information about the contract and the tutorial to use the demo page. -->

[peek_a_book]: https://ethresear.ch/t/peekabook-private-order-matching/6987
[smp_wiki]: https://en.wikipedia.org/wiki/Socialist_millionaires
[js_smp_peer]: https://github.com/mhchia/js-smp-peer
[ethereum]: https://en.wikipedia.org/wiki/Ethereum
