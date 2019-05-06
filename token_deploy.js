const Web3 = require('web3');
const config = require('./conf.json');
const chain = config.rinkeby;
const OnchainPayment = require('./build/contracts/LiteXToken.json');
const constructArgs = [];
var Tx = require('ethereumjs-tx');
const privateKey = chain.privateKey;
const web3 = new Web3(Web3.givenProvider || chain.provider);
const account = web3.eth.accounts.privateKeyToAccount(privateKey) // create account by private key from config
web3.eth.accounts.wallet.add(account) // add account to cita

const deploy = async () => {
    console.log("start deploy");
    let address = web3.eth.accounts.wallet[0].address;
    let balance = await web3.eth.getBalance(address);
    const MyContract = new web3.eth.Contract(OnchainPayment.abi);
    const bytecodeWithParam = await MyContract.deploy({
      data: OnchainPayment.bytecode,
      arguments: constructArgs,
    }).encodeABI();   // console.log("abi is ", result);
    const nonce = await web3.eth.getTransactionCount(address);
    await executeTransaction(bytecodeWithParam, nonce);
};

async function executeTransaction(bytecodeWithParam, nonce){
    var rawTransaction = {
        "from": account.address,
        "nonce": "0x" + nonce.toString(16),
        "gasPrice": web3.utils.toHex(50 * 1e9),
        "gasLimit": web3.utils.toHex(7000000),
        "data": bytecodeWithParam,
      };
      var privKey = new Buffer(privateKey.substr(2), 'hex');
      var tx = new Tx(rawTransaction);
      tx.sign(privKey);
      var serializedTx = tx.serialize();
      web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function(err, hash) {
        if (!err){
            console.log(hash); // "0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385"
        }else{
            console.log('error', err);
        }
      });
}
deploy();
