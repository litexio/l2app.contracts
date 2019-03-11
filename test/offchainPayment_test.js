const myEcsign = require('./helper/myEcsign.js');
const BigNumber = web3.BigNumber;

var OffchainPayment = artifacts.require("OffchainPayment");

contract('OffchainPayment', (accounts) => {

  console.log('accounts', accounts);

  const providerAddress = accounts[0];
  const regulatorAddress = accounts[1];
  const userAddress = accounts[2];
  const tokenAddress = accounts[3];
  const puppetAddress = accounts[4];
  const puppetAddress2 = accounts[5];
  const puppetAddress3 = accounts[6];

  const providerPrivateKey = Buffer.alloc("a5f37d95f39a584f45f3297d252410755ced72662dbb886e6eb9934efb2edc93");
  const regulatorPrivateKey = Buffer.alloc("2fc8c9e1f94711b52b98edab123503519b6a8a982d38d0063857558db4046d89");
  const userPrivateKey = Buffer.alloc("d01a9956202e7b447ba7e00fe1b5ca8b3f777288da6c77831342dbd2cb022f8f");

  beforeEach(async ()=>{
    this.offchainPayment = await OffchainPayment.new(providerAddress, providerAddress, regulatorAddress, {from: providerAddress});
  });

  it("should onchainAddPuppet successfully", async() =>{

    await this.offchainPayment.onchainAddPuppet(userAddress, puppetAddress, {from: regulatorAddress})
    await this.offchainPayment.onchainAddPuppet(userAddress, puppetAddress2, {from: regulatorAddress})
    await this.offchainPayment.onchainAddPuppet(userAddress, puppetAddress3, {from: regulatorAddress})

    let puppetData = await this.offchainPayment.puppets.call(userAddress, 0);
    console.log("puppetData", puppetData);
    puppetData = await this.offchainPayment.puppets.call(userAddress, 1);
    console.log("puppetData", puppetData);

  });


  it("should onchainDisablePuppet successfully", async() => {

    await this.offchainPayment.onchainAddPuppet(userAddress, puppetAddress, {from: regulatorAddress})
    await this.offchainPayment.onchainDisablePuppet(userAddress, puppetAddress, {from: regulatorAddress})

    let puppetData = await this.offchainPayment.puppets.call(userAddress, 0);
    console.log("puppetData", puppetData);


  });

  it("should onchainOpenChannel successfully", async ()=>{

    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 10000;

    console.log("channelID is ", channelID);
    await this.offchainPayment.onchainOpenChannel(
      userAddress,
      tokenAddress,
      channelID,
      amount,
      { from: regulatorAddress}
    );

    let pnData = await this.offchainPayment.paymentNetworkMap.call(tokenAddress)
    console.log("pyamentNetworkMap data", pnData);
    let channelData = await this.offchainPayment.channelMap.call(channelID);
    console.log("channelMap data", channelData);

    let balanceProofData = await this.offchainPayment.contract.methods.balanceProofMap(channelID, userAddress).call({from: userAddress});
    console.log("balanceProofData", balanceProofData);

    assert.equal(channelData.user, userAddress, "address should be equal");
    assert.equal(channelData.userDeposit, amount, "amount should be equal");
    assert.equal(channelData.status, 1, "status should be open")

    // let userProofData = await this.offchainPayment.balanceProofMap.call(channelID, userAddress);
    // console.log("userProofData", userProofData);


    // console.log("offchainPayment", this.offchainPayment);
  });


  it("should onchainUserDeposit successfully", async() =>{

    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 10000;
    // console.log("channelID is ", channelID);
    await this.offchainPayment.onchainOpenChannel( userAddress, tokenAddress, channelID, amount, { from: regulatorAddress} );

    let depositAmount = 10000;
    await this.offchainPayment.onchainUserDeposit( channelID, userAddress, amount + depositAmount, { from: regulatorAddress} );

    let pnData = await this.offchainPayment.paymentNetworkMap.call(tokenAddress)
    // console.log("pyamentNetworkMap data", pnData);
    let channelData = await this.offchainPayment.channelMap.call(channelID);
    // console.log("channelMap data", channelData);

    assert.equal(channelData.userDeposit, amount + depositAmount, "deposit should be equal");
    assert.equal(pnData.userTotalDeposit, amount + depositAmount, "userTotalDeposit shoule be equal");

  });

  it("should onchainProviderDeposit successfully", async()=>{

    let amount = 20000;
    await this.offchainPayment.onchainProviderDeposit(tokenAddress, amount, { from: regulatorAddress});

    let pnData = await this.offchainPayment.paymentNetworkMap.call(tokenAddress)

    assert.equal(pnData.providerDeposit, amount, "providerDeposit shoule be equal");
    assert.equal(pnData.providerBalance, amount, "providerBalance shoule be equal");

  });

  it("should transfer successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let balance = 200;
    let nonce = 1;
    let additionalHash = channelID;
    let messageHash = web3.utils.soliditySha3(providerAddress, channelID, balance, nonce, additionalHash);
    let signature = myEcsign(messageHash, providerPrivateKey);
    await this.offchainPayment.transfer(userAddress, channelID, balance, nonce, additionalHash, signature, {from: providerAddress});
    let balanceProofData = await this.offchainPayment.balanceProofMap.call(channelID, userAddress);

    console.log("balance proof: ", balanceProofData);
    assert.equal(balanceProofData.nonce == nonce, "nonce should be right");
  });

  it("should guard balance proof successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let balance = 200;
    let nonce = 1;
    let additionalHash = channelID;
    let messageHash = web3.utils.soliditySha3(providerAddress, channelID, balance, nonce, additionalHash);
    let signature = myEcsign(messageHash, providerPrivateKey);
    await this.offchainPayment.guardBalanceProof(channelID, balance, nonce, additionalHash, signature, signature, {from: userAddress});
    let balanceProofData = await this.offchainPayment.balanceProofMap.call(channelID, userAddress);

    console.log("balance proof after guardian: ", balanceProofData);
    assert.equal(balanceProofData.consignorSignature == signature, "consignorSignature should be right");
  });

  it("should submit fee successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 22;
    let nonce = 2;
    let messageHash = web3.utils.soliditySha3(providerAddress, tokenAddress, amount, nonce);
    let signature = myEcsign(messageHash, providerPrivateKey);
    await this.offchainPayment.submitFee(channelID, tokenAddress, amount, nonce, signature, {from: providerAddress});
    let feeProofData = await this.offchainPayment.feeProofMap.call(tokenAddress);

    console.log("fee proof: ", feeProofData);
    assert.equal(feeProofData.nonce == nonce, "nonce should be right");
  });

  it("should user propose withdraw successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 8;
    let receiver = userAddress;
    let lastCommitBlock = 888;
    await this.offchainPayment.userProposeWithdraw(channelID, amount, receiver, lastCommitBlock, {from: userAddress});
    let userWithdrawProofData = await this.offchainPayment.userWithdrawProofMap.call(channelID);

    console.log("user withdraw proof: ", userWithdrawProofData);
    assert.equal(userWithdrawProofData.lastCommitBlock == lastCommitBlock, "last commit block should be right");
  });

  it("should confirm user withdraw successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 8;
    let lastCommitBlock = 888;
    let messageHash = web3.utils.soliditySha3(providerAddress, channelID, amount, lastCommitBlock);

    let providerSignature = myEcsign(messageHash, providerPrivateKey);
    await this.offchainPayment.confirmUserWithdraw(channelID, providerSignature, {from: providerAddress});
    let userWithdrawProofData = await this.offchainPayment.userWithdrawProofMap.call(channelID);
    assert.equal(userWithdrawProofData.providerSignature == providerSignature, "provider signature should be right");

    let regulatorSignature = myEcsign(messageHash, regulatorPrivateKey);
    await this.offchainPayment.confirmUserWithdraw(channelID, regulatorSignature, {from: regulatorAddress});
    userWithdrawProofData = await this.offchainPayment.userWithdrawProofMap.call(channelID);
    assert.equal(userWithdrawProofData.regulatorSignature == regulatorSignature, "regulator signature should be right");
    assert.equal(userWithdrawProofData.isConfirmed == true, "is confirmed should be true");
  });

  it("should provider propose withdraw successfully", async()=>{
    let balance = 8;
    let lastCommitBlock = 888;
    await this.offchainPayment.providerProposeWithdraw(tokenAddress, balance, lastCommitBlock, {from: providerAddress});
    let providerWithdrawProofData = await this.offchainPayment.providerWithdrawProofMap.call(tokenAddress);

    console.log("provider withdraw proof: ", providerWithdrawProofData);
    assert.equal(providerWithdrawProofData.balance == balance, "balance should be right");
  });

  it("should confirm provider withdraw successfully", async()=>{
    let balance = 8;
    let lastCommitBlock = 888;
    let messageHash = web3.utils.soliditySha3(providerAddress, tokenAddress, balance, lastCommitBlock);
    let signature = myEcsign(messageHash, regulatorPrivateKey);
    await this.offchainPayment.confirmProviderWithdraw(tokenAddress, signature, {from: regulatorAddress});
    let providerWithdrawProofData = await this.offchainPayment.providerWithdrawProofMap.call(tokenAddress);

    console.log("provider withdraw proof: ", providerWithdrawProofData);
    assert.equal(providerWithdrawProofData.signature == signature, "signature should be right");
  });

  it("should propose cooperative settle successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let balance = 8;
    let lastCommitBlock = 888;
    await this.offchainPayment.proposeCooperativeSettle(channelID, balance, lastCommitBlock, {from: userAddress});
    let cooperativeSettleProofData = await this.offchainPayment.cooperativeSettleProofMap.call(channelID);
     
    console.log("cooperative settle proof data: ", cooperativeSettleProofData);
    assert.equal(cooperativeSettleProofData.lastCommitBlock == lastCommitBlock, "last commit block should be right");
  });

  it("should confirm cooperative settle successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let balance = 8;
    let lastCommitBlock = 888;
    let messageHash = web3.utils.soliditySha3(providerAddress, channelID, balance, lastCommitBlock);
    let providerSignature = myEcsign(messageHash, providerPrivateKey);
    await this.offchainPayment.confirmCooperativeSettle(channelID, providerSignature, {from: providerAddress});
    let cooperativeSettleProofData = await this.offchainPayment.cooperativeSettleProofMap.call(channelID);
    assert.equal(cooperativeSettleProofData.providerSignature == providerSignature);

    let regulatorSignature = myEcsign(messageHash, regulatorPrivateKey);
    await this.offchainPayment.confirmCooperativeSettle(channelID, regulatorSignature, {from: regulatorAddress});
    cooperativeSettleProofData = await this.offchainPayment.cooperativeSettleProofMap.call(channelID);
    assert.equal(cooperativeSettleProofData.regulatorSignature == regulatorSignature);
    assert.equal(cooperativeSettleProofData.isConfirmed == true);
  });

  it("should proposeRebalance successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 8;
    let nonce = 888;
    let messageHash = web3.utils.soliditySha3(providerAddress, channelID, amount, nonce);
    let signature = myEcsign(messageHash, providerPrivateKey);
    await this.offchainPayment.proposeRebalance(channelID, amount, nonce, signature, {from: providerAddress});
    let rebalanceProofData = await this.offchainPayment.proposeRebalanceProofMap[messageHash];

    console.log("rebalance proof data: ", rebalanceProofData);
    assert.equal(rebalanceProofData.nonce == nonce);
    assert.equal(rebalanceProofData.providerSignature == signature);
  });

  it("should confirm rebalance successfully", async()=>{
    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 8;
    let nonce = 888;
    let messageHash = web3.utils.soliditySha3(providerAddress, channelID, amount, nonce);
    let signature = myEcsign(messageHash, regulatorPrivateKey);
    await this.offchainPayment.confirmRebalance(messageHash, signature, {from: regulatorAddress});
    let rebalanceProofData = await this.offchainPayment.rebalanceProofMap[channelID];

    console.log("rebalance proof data after confirmed: ", rebalanceProofData);
    assert.equal(rebalanceProofData.regulatorSignature == signature);
  })

  it("should onchainUserWithdraw successfully", async() => {

      let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
      let amount = 10000;
      // console.log("channelID is ", channelID);
      await this.offchainPayment.onchainOpenChannel( userAddress, tokenAddress, channelID, amount, { from: regulatorAddress} );

      let withdrawAmount = 100;
      let lastCommitBlock = await web3.eth.getBlockNumber();
      await this.offchainPayment.onchainUserWithdraw(channelID, withdrawAmount, withdrawAmount, lastCommitBlock, { from: regulatorAddress});



      let pnData = await this.offchainPayment.paymentNetworkMap.call(tokenAddress)
      // console.log("pyamentNetworkMap data", pnData);
      let channelData = await this.offchainPayment.channelMap.call(channelID);
      // console.log("channelMap data", channelData);

      assert.equal(channelData.userBalance, amount - withdrawAmount, "userBalance should be equal");
      assert.equal(channelData.userWithdraw, withdrawAmount, "userWithdraw should be equal");
      assert.equal(pnData.userTotalWithdraw, withdrawAmount, "userTotalWithdraw shoule be equal");

  });

  it("should onchainUserWithdraw unlockAsset successfully", async()=>{

  });


  it("should onchainProviderWithdraw successfully", async() => {

    let amount = 20000;
    await this.offchainPayment.onchainProviderDeposit(tokenAddress, amount, { from: regulatorAddress});

    let withdrawAmount = 100;
    let lastCommitBlock = await web3.eth.getBlockNumber();
    await this.offchainPayment.onchainProviderWithdraw(tokenAddress, withdrawAmount, withdrawAmount , lastCommitBlock, { from: regulatorAddress});


    let pnData = await this.offchainPayment.paymentNetworkMap.call(tokenAddress);

    assert.equal(pnData.providerWithdraw, withdrawAmount, "providerWithdraw should be equal");
    assert.equal(pnData.providerBalance, amount - withdrawAmount, "providerBalance should be equal");

  });

  it("should onchainProviderWithdraw unlockAsset successfully", async()=>{

  });


  it("should onchainCooperativeSettleChannel successfully", async()=>{


    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 10000;
    // console.log("channelID is ", channelID);
    await this.offchainPayment.onchainOpenChannel( userAddress, tokenAddress, channelID, amount, { from: regulatorAddress} );

    let balance = 1000;
    let lastCommitBlock = await web3.eth.getBlockNumber();
    await this.offchainPayment.onchainCooperativeSettleChannel(channelID, userAddress, balance, lastCommitBlock, { from: regulatorAddress});


      let pnData = await this.offchainPayment.paymentNetworkMap.call(tokenAddress)
      // console.log("pyamentNetworkMap data", pnData);
      let channelData = await this.offchainPayment.channelMap.call(channelID);
      // console.log("channelMap data", channelData);

      assert.equal(channelData.status, 3, "channel status should be equal");
      assert.equal(pnData.providerTotalSettled, amount - balance, "providerTotalSettled shoule be equal");
      assert.equal(pnData.providerBalance, amount - balance, "providerBalance shoule be equal");

  });

  it("should onchain force close channel successfully", async() => {

    let channelID = web3.utils.soliditySha3({t: 'address', v: providerAddress}, {t: 'address', v: userAddress});
    let amount = 10000;
    // console.log("channelID is ", channelID);
    await this.offchainPayment.onchainOpenChannel( userAddress, tokenAddress, channelID, amount, { from: regulatorAddress} );

    await this.offchainPayment.onchainCloseChannel(channelID, userAddress, 20000, 1, 10000, { from: regulatorAddress});

    await this.offchainPayment.onchainPartnerUpdateProof(channelID,  20000, 1, 5000, 1, { from: regulatorAddress});

    await this.offchainPayment.onchainSettleChannel(channelID, 5000, 5000, { from: regulatorAddress});

    let closingData = await this.offchainPayment.closingChannelMap.call(channelID);
    console.log("closingData", closingData);

  });



})
