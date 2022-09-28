const {ethers} = require("ethers");
const {ScanCommand, DynamoDBDocumentClient} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const freeTransferAbi = require("../abis/FreeTransfer.json");
const erc20abi = require("../abis/erc20.json");

const SupportedChainId = {
  BSC: 56,
  BSC_TEST: 97,
}

const NETWORK_URLS = {
  [SupportedChainId.BSC]: `https://bsc-dataseed.binance.org/`,
  [SupportedChainId.BSC_TEST]: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
}

const FREE_TRANSFER_ADDRESS = {
  [SupportedChainId.BSC]: '0x8d8e4d946ED4c818C9ace798C869C6F93cCF3df0',
  [SupportedChainId.BSC_TEST]: '0xA4Cd6C205cEF92aB066177207114B6831194F61f',
}

const NEST_ADDRESS = {
  [SupportedChainId.BSC]: '0x98f8669f6481ebb341b522fcd3663f79a3d1a6a7',
  [SupportedChainId.BSC_TEST]: '0x821edD79cc386E56FeC9DA5793b87a3A52373cdE',
}

const TX_URL = {
  [SupportedChainId.BSC]: 'https://bscscan.com/tx/',
  [SupportedChainId.BSC_TEST]: 'https://testnet.bscscan.com/tx/',
}

const mnemonic = process.env.MNEMONIC

const walletMnemonic = ethers.Wallet.fromMnemonic(mnemonic)

// const BSCProvider = new ethers.providers.JsonRpcProvider(NETWORK_URLS[SupportedChainId.BSC]);
const BSCTestProvider = new ethers.providers.JsonRpcProvider(NETWORK_URLS[SupportedChainId.BSC_TEST]);
// const BSCProviderWithSinger = walletMnemonic.connect(BSCProvider)
const BSCTestProviderWithSinger = walletMnemonic.connect(BSCTestProvider)

const BSCTestFreeTransferContract = new ethers.Contract(FREE_TRANSFER_ADDRESS[SupportedChainId.BSC_TEST], freeTransferAbi, BSCTestProviderWithSinger)
// const BSCFreeTransferContract = new ethers.Contract(FREE_TRANSFER_ADDRESS[SupportedChainId.BSC], freeTransferAbi, BSCProviderWithSinger)
const NESTTestContract = new ethers.Contract(NEST_ADDRESS[SupportedChainId.BSC_TEST], erc20abi, BSCTestProviderWithSinger)
// const NESTContract = new ethers.Contract(NEST_ADDRESS[SupportedChainId.BSC], erc20abi, BSCProviderWithSinger)

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const main = async () => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    IndexName: 'red-envelope-index',
    FilterExpression: '#s = :s',
    ExpressionAttributeNames: {
      '#s': 'status',
    },
    ExpressionAttributeValues: {
      ':s': 'pending',
    },
  })).catch(() => {
    ctx.answerCbQuery("Fetch pending NEST Prize failed, please try again later.")
    ctx.reply("Fetch pending NEST Prize failed, please try again later.")
  });
  console.log('Prize amount:', result.Items.length)
  let pendingList = []
  for (const item of result.Items) {
    pendingList.push.apply(pendingList, item.record.filter(r => r.amount > 0))
  }
  pendingList = pendingList.slice(0, 1)
  const addressList = pendingList.map(item => item.wallet)
  const tokenAmountList = pendingList.map(item => ethers.BigNumber.from(item.amount).mul(ethers.BigNumber.from(10).pow(18)).toString())
  
  // try {
  //   const res = await BSCTestFreeTransferContract.transfer(
  //       addressList,
  //       tokenAmountList,
  //       NEST_ADDRESS[SupportedChainId.BSC_TEST],
  //       {
  //         gasLimit: 95000 * addressList.length,
  //       }
  //   )
  //   console.log(TX_URL[SupportedChainId.BSC_TEST] + res.hash)
  // } catch (e) {
  //   console.log(e)
  // }
}

main()
