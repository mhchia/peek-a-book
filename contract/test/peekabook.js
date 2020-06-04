const PeekABook = artifacts.require("PeekABook");

contract('PeekABook', (accounts) => {
  it('test `advertise` and `invalidate`', async () => {
    const peekABookInstance = await PeekABook.deployed();

    // Test: `maxID` should be `0`.
    assert.equal((await peekABookInstance.maxID.call()).toNumber(), 0);

    // Test: `invalidate` fails since there is no advertisement.
    try {
        await peekABookInstance.invalidate.call(0);
        assert.fail();
    } catch (e) {
        // Do nothing.
    }

    // Test: `advertise` should add an advertisement successfully.
    const pairName = 'ETHUSDT';
    const buyOrSell = true;
    const amount = 1000;
    const owner = accounts[0];
    await peekABookInstance.advertise(pairName, buyOrSell, amount, { from: owner });
    const ad0 = await peekABookInstance.advertisements.call(0);
    assert.equal((await peekABookInstance.maxID.call()).toNumber(), 1);
    assert.equal(ad0.pair, pairName, '`advertisement.pair` is wrong');
    assert.equal(ad0.buyOrSell, buyOrSell, '`advertisement.buyOrSell` is wrong');
    assert.equal(ad0.amount.toNumber(), amount, '`advertisement.amount` is wrong');
    assert.equal(ad0.owner, owner, '`advertisement.owner` is wrong');

    // Test: `advertise` should add another advertisement successfully, and the previously added
    //  ones should not be changed.
    await peekABookInstance.advertise('BTCUSDT', false, 100, { from: accounts[1] });
    const ad1 = await peekABookInstance.advertisements.call(1);
    assert.equal((await peekABookInstance.maxID.call()).toNumber(), 2);
    assert.equal(ad1.pair, 'BTCUSDT', '`advertisement.pair` is wrong');
    assert.equal(ad1.buyOrSell, false, '`advertisement.buyOrSell` is wrong');
    assert.equal(ad1.amount.toNumber(), 100, '`advertisement.amount` is wrong');
    assert.equal(ad1.owner, accounts[1], '`advertisement.owner` is wrong');
    // 0th advertisement is unchanged.
    const ad0Again = await peekABookInstance.advertisements.call(0);
    console.log(ad0Again);
    assert.equal(ad0.pair, ad0Again.pair, '`advertisement.pair` is wrong');
    assert.equal(ad0.buyOrSell, ad0Again.buyOrSell, '`advertisement.buyOrSell` is wrong');
    assert.equal(ad0.amount.toNumber(), ad0Again.amount.toNumber(), '`advertisement.amount` is wrong');
    assert.equal(ad0.owner, ad0Again.owner, '`advertisement.owner` is wrong');

    // Test: `invalidate` fails since `accounts[0]` is not the advertisement owner.
    try {
        await peekABookInstance.invalidate.call(1, { from: accounts[0] });
    } catch(e) {
        // Do nothing.
    }
    // Should succeed now.
    await peekABookInstance.invalidate(1, { from: accounts[1] });
    const adInvalidated = await peekABookInstance.advertisements.call(1);
    assert.equal(adInvalidated.isValid, false, "advertisement.isValid should have been set to false");
  });
});
