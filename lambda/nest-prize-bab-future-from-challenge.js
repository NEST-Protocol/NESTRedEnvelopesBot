const axios = require("axios");
const {ethers} = require("ethers");
const erc721abi = require("../abis/erc721.json");

const apiKey = process.env.APIKEY
const NETWORK_URL = 'https://bsc-dataseed.binance.org/'
const provider = new ethers.providers.JsonRpcProvider(NETWORK_URL)

const BABT_ADDRESS = '0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8'
const BABT = new ethers.Contract(BABT_ADDRESS, erc721abi, provider)

exports.handler = async (event) => {
  const wallet = JSON.parse(event?.body)?.wallet ?? undefined
  const lever = event?.queryStringParameters?.lever ?? undefined
  const total = event?.queryStringParameters?.total ?? undefined
  const from = event?.queryStringParameters?.from ?? undefined
  
  if (wallet === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  try {
    const balanceOfBABT = await BABT.balanceOf(wallet)
  
    if (balanceOfBABT.eq(0)) {
      return {
        statusCode: 200,
        body: false
      }
    }
  } catch (e) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  try {
    const req = await axios({
      method: 'GET',
      url: `https://api.bscscan.com/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`,
    })
    const data = req.data.result || []
    const buyTx = data.filter((tx) => {
      return tx.methodId === '0x15ee0aad' &&
          tx.isError === '0' &&
          tx.to.toLowerCase() === "0x8e32C33814271bD64D5138bE9d47Cd55025074CD".toLowerCase()
    })
    
    if (buyTx.length === 0) {
      return {
        statusCode: 200,
        body: false
      }
    }
    
    if (from !== undefined) {
      const from_date = new Date(from)
      const res = buyTx.some((tx) => {
        const txDate = new Date(tx.timeStamp * 1000)
        return txDate < from_date
      })
      
      if (res) {
        return {
          statusCode: 200,
          body: false
        }
      }
    }
    
    if (lever !== undefined) {
      const res = buyTx.some((tx) => {
        const input = tx.input
        const txLever = parseInt(input.slice(74, 138), 16)
        return txLever >= parseInt(lever)
      })
      
      if (!res) {
        return {
          statusCode: 200,
          body: false
        }
      }
    }
    
    if (total !== undefined) {
      const totalAmount = buyTx.reduce((acc, tx) => {
        const input = tx.input
        const txAmount = parseInt(input.slice(202, 266), 16) / 1e18
        return acc + txAmount
      }, 0)
      
      if (totalAmount < parseInt(total)) {
        return {
          statusCode: 200,
          body: false
        }
      }
    }
  } catch (e) {
    return {
      statusCode: 200,
      body: false,
    };
  }
  
  return {
    statusCode: 200,
    body: true,
  };
};