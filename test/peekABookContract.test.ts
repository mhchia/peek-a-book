import { ethers } from 'ethers';

import { PeekABookContract } from '../src/ts/peekABookContract';

const contractJSON = require(`${__dirname}/../build/contracts/PeekABook.json`);

const ganacheHTTPURL = 'http://localhost:8545';
const provider = new ethers.providers.JsonRpcProvider(ganacheHTTPURL);
const signer0 = provider.getSigner(0);

async function getContract(): Promise<ethers.Contract> {
  const factory = new ethers.ContractFactory(
    contractJSON.abi,
    contractJSON.bytecode,
    signer0
  );
  const contract = await factory.deploy();
  await contract.deployed();
  return contract;
}

describe('PeekABookContract', () => {
  let contract: ethers.Contract;
  let peekABookContract: PeekABookContract;

  const btcPair = 'BTCUSDT';
  const ethPair = 'ETHUSDT';

  beforeAll(async () => {
    contract = await getContract();
    peekABookContract = new PeekABookContract(provider, contract, {
      fromBlock: 0,
    });
    const ads = [
      { pair: btcPair, buyOrSell: true, amount: 1, peerID: 'peerA' },
      { pair: btcPair, buyOrSell: true, amount: 2, peerID: 'peerA' },
      { pair: ethPair, buyOrSell: true, amount: 3, peerID: 'peerC' },
      { pair: ethPair, buyOrSell: false, amount: 4, peerID: 'peerD' },
    ];
    const invalidates: number[] = [2];
    for (const ad of ads) {
      const tx = await peekABookContract.advertise(ad);
      await tx.wait();
    }
    for (const adID of invalidates) {
      const tx = await peekABookContract.invalidate(adID);
      await tx.wait();
    }
  });

  test('getAdvertiseLogs', async () => {
    // Test: without filters
    expect((await peekABookContract.getAdvertiseLogs()).length).toEqual(4);
    // Test: filter with `pair`
    expect((await peekABookContract.getAdvertiseLogs(btcPair)).length).toEqual(
      2
    );
    expect((await peekABookContract.getAdvertiseLogs(ethPair)).length).toEqual(
      2
    );
    expect(
      (await peekABookContract.getAdvertiseLogs('LTCUSDT')).length
    ).toEqual(0);
    // Test: filter with `buyOrSell`
    expect(
      (await peekABookContract.getAdvertiseLogs(null, true)).length
    ).toEqual(3);
    expect(
      (await peekABookContract.getAdvertiseLogs(null, false)).length
    ).toEqual(1);
    // Test: filter with `peerID`
    expect(
      (await peekABookContract.getAdvertiseLogs(null, null, 'peerA')).length
    ).toEqual(2);
    expect(
      (await peekABookContract.getAdvertiseLogs(null, null, 'peerB')).length
    ).toEqual(0);
    expect(
      (await peekABookContract.getAdvertiseLogs(null, null, 'peerC')).length
    ).toEqual(1);
    expect(
      (await peekABookContract.getAdvertiseLogs(null, null, 'peerD')).length
    ).toEqual(1);
    // Test: multiple filters altogether
    expect(
      (await peekABookContract.getAdvertiseLogs(btcPair, null, 'peerA')).length
    ).toEqual(2);
    expect(
      (await peekABookContract.getAdvertiseLogs(btcPair, true, 'peerA')).length
    ).toEqual(2);
    expect(
      (await peekABookContract.getAdvertiseLogs(btcPair, false, 'peerA')).length
    ).toEqual(0);
    expect(
      (await peekABookContract.getAdvertiseLogs(ethPair, null, 'peerC')).length
    ).toEqual(1);
    expect(
      (await peekABookContract.getAdvertiseLogs(ethPair, true, 'peerC')).length
    ).toEqual(1);
    expect(
      (await peekABookContract.getAdvertiseLogs(ethPair, false, 'peerC')).length
    ).toEqual(0);
  });

  test('getInvalidateLogs', async () => {
    const logs = await peekABookContract.getInvalidateLogs();
    expect(logs.length).toEqual(1);
    expect(logs[0].adID.toNumber()).toEqual(2);
  });

  test('getValidAdvertisements', async () => {
    const adLogs = await peekABookContract.getValidAdvertisements();
    // Test: the advertisement log whose adID is `2` is removed.
    expect(adLogs.length).toEqual(3);
    expect(adLogs.filter((obj) => obj.adID.toNumber() === 2).length).toEqual(0);
  });
});
