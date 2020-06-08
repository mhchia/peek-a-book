pragma solidity >=0.4.21 <0.7.0;

contract PeekABook {
    event Advertise(
        uint adID,
        string indexed pairIndex,
        string pair,
        bool indexed buyOrSell,
        uint amount,
        string indexed peerIDIndex,
        string peerID
    );
    event Invalidate(uint adID);

    uint public maxID;
    mapping (uint => address) public adOwner;

    function advertise(string memory pair, bool buyOrSell, uint amount, string memory peerID) public returns(uint) {
        uint adID = maxID;
        adOwner[adID] = msg.sender;
        emit Advertise(adID, pair, pair, buyOrSell, amount, peerID, peerID);
        maxID += 1;
        return adID;
    }

    function invalidate(uint adID) public {
        require(adID < maxID, "advertisement not found");
        address owner = adOwner[adID];
        require(owner == msg.sender, "advertisement can only be invalidated by the owner");
        emit Invalidate(adID);
    }
}
