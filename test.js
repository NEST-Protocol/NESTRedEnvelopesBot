const {ethers} = require("ethers");
const erc20abi = require("./abis/erc20.json");

const SupportedChainId = {
  BSC: 56,
  BSC_TEST: 97,
}

const NETWORK_URLS = {
  [SupportedChainId.BSC]: `https://bsc-dataseed.binance.org/`,
  [SupportedChainId.BSC_TEST]: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
}

const NEST_ADDRESS = {
  [SupportedChainId.BSC]: '0x98f8669f6481ebb341b522fcd3663f79a3d1a6a7',
  [SupportedChainId.BSC_TEST]: '0x821edD79cc386E56FeC9DA5793b87a3A52373cdE',
}

const BSCTestProvider = new ethers.providers.JsonRpcProvider(NETWORK_URLS[SupportedChainId.BSC_TEST]);

const NESTTestContract = new ethers.Contract(NEST_ADDRESS[SupportedChainId.BSC_TEST], erc20abi, BSCTestProvider)

NESTTestContract.balanceOf('0x3B00ce7E2d0E0E905990f9B09A1F515C71a91C10').then((res) => {
  console.log(Number(ethers.utils.formatEther(res)))
})

