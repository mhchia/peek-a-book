const PeekABook = artifacts.require("PeekABook");

module.exports = function(deployer) {
  deployer.deploy(PeekABook);
};
