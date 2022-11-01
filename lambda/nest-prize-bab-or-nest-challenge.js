const {ethers} = require("ethers");
const erc20abi = require("./erc20.json");
const erc721abi = require("./erc721.json");

const NETWORK_URL = 'https://bsc-dataseed.binance.org/'

const NEST_ADDRESS = '0x98f8669f6481ebb341b522fcd3663f79a3d1a6a7'

const BABT_ADDRESS = '0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8'

const provider = new ethers.providers.JsonRpcProvider(NETWORK_URL)

const NEST = new ethers.Contract(NEST_ADDRESS, erc20abi, provider)
const BABT = new ethers.Contract(BABT_ADDRESS, erc721abi, provider)

exports.handler = async (event) => {
  const nest_min_value = event?.queryStringParameters?.nest ?? undefined
  const wallet = JSON.parse(event?.body)?.wallet ?? undefined
  
  if (nest_min_value === undefined || wallet === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  const [balanceOfNEST, balanceOfBABT] = await Promise.all([
    NEST.balanceOf(wallet),
    BABT.balanceOf(wallet)
  ])
  
  if (balanceOfNEST.gte(ethers.utils.parseEther(nest_min_value)) || balanceOfBABT.gte(1)) {
    return {
      statusCode: 200,
      body: true,
    };
  }
  
  return {
    statusCode: 200,
    body: false,
  };
};
