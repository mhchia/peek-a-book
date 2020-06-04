pragma solidity >=0.4.21 <0.7.0;

contract PeekABook {
    struct Advertisement {
        string pair;  // BTCUSDT, ETHUSDT, ...
        bool buyOrSell;  // true=buy, false=sell.
        address owner;  // caller of `advertise`.
        uint amount;
        bool isValid;  // Whether this advertisement is still valid or not.
    }
    uint public maxID;
    mapping (uint => Advertisement) public advertisements;

    function advertise(string memory pair, bool buyOrSell, uint amount) public returns(uint) {
        uint adID = maxID;
        advertisements[adID] = Advertisement(pair, buyOrSell, msg.sender, amount, true);
        maxID += 1;
        return adID;
    }

    function invalidate(uint adID) public {
        require(adID < maxID, "advertisement not found");
        Advertisement storage ad = advertisements[adID];
        require(ad.owner == msg.sender, "advertisement can only be invalidated by the owner");
        ad.isValid = false;
    }
}
