const ethUtil = require('ethereumjs-util');
const BigNumber = web3.BigNumber;

var OnchainPayment = artifacts.require("OnchainPayment");

function myEcsign(messageHash, privateKey) {
  messageHash = Buffer.from(messageHash.substr(2), 'hex')
  let signatureObj = ethUtil.ecsign(messageHash, privateKey);
  let signatureHexString = ethUtil.toRpcSig(signatureObj.v, signatureObj.r, signatureObj.s).toString('hex');
  let signatureBytes = web3.utils.hexToBytes(signatureHexString);
  return signatureBytes;
}

contract('OnchainPayment', (accounts) => {

  console.log('accounts', accounts);

  const providerAddress = accounts[0];
  const regulatorAddress = accounts[1];
  const userAddress = accounts[2];
  const tokenAddress = accounts[3];
  const puppetAddress = accounts[4];
  const puppetAddress2 = accounts[5];
  const puppetAddress3 = accounts[6];

  const providerPrivateKey = Buffer.from("a5f37d95f39a584f45f3297d252410755ced72662dbb886e6eb9934efb2edc93", 'hex');
  const regulatorPrivateKey = Buffer.from("2fc8c9e1f94711b52b98edab123503519b6a8a982d38d0063857558db4046d89", 'hex');
  const userPrivateKey = Buffer.from("d01a9956202e7b447ba7e00fe1b5ca8b3f777288da6c77831342dbd2cb022f8f", 'hex');

  beforeEach(async ()=>{
    this.OnchainPayment = await OnchainPayment.new(regulatorAddress, providerAddress, 1, 9, 1, {from: providerAddress});
  });

  it("should  successfully", async() =>{
      let res = await this.OnchainPayment.openChannel(userAddress, userAddress, 5, '0x0000000000000000000000000000000000000000', 0, {from: userAddress, value: 100});

      let channelID = res.receipt.logs[0].args[6];
        console.log(channelID, this.OnchainPayment.address);
        
        let messageHash = web3.utils.soliditySha3(this.OnchainPayment.address, channelID, 1, 9999);
        let psignature = myEcsign(messageHash, providerPrivateKey);
        let rsignature = myEcsign(messageHash, regulatorPrivateKey);

        res = await this.OnchainPayment.cooperativeSettle(channelID, 1, 9999, psignature, rsignature, {from: userAddress});

        res = await this.OnchainPayment.openChannel(userAddress, userAddress, 5, '0x0000000000000000000000000000000000000000', 0, {from: userAddress, value: 100});
    });

});