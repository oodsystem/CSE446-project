const HumanitarianEscrow = artifacts.require("HumanitarianEscrow");

module.exports = function (deployer) {
  deployer.deploy(HumanitarianEscrow);
};
