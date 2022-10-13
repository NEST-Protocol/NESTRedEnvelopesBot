const axios = require("axios");

const apiKey = process.env.APIKEY
exports.handler = async (event) => {
  const user_id = JSON.parse(event?.body)?.user_id ?? undefined
  const wallet = JSON.parse(event?.body)?.wallet ?? undefined
  const lever = event?.queryStringParameters?.lever ?? undefined
  const amount = event?.queryStringParameters?.amount ?? undefined
  const total = event?.queryStringParameters?.total ?? undefined
  
  if (user_id === undefined && wallet === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  try {
    const req = await axios({
      method: 'GET',
      url: `https://api.bscscan.com/api?module=account&action=txlist&address=0x8e32C33814271bD64D5138bE9d47Cd55025074CD&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`,
    })
    const data = req.data.result || []
    const now = new Date()
    const buyTx = data.filter((tx) => {
      const txDate = new Date(tx.timeStamp * 1000)
      return tx.methodId === '0x15ee0aad' &&
          tx.isError === '0' &&
          tx.from.toLowerCase() === wallet.toLowerCase() &&
          now.getFullYear() === txDate.getFullYear() &&
          now.getMonth() === txDate.getMonth() &&
          now.getDate() === txDate.getDate()
    })
    
    if (lever === undefined || amount === undefined || total === undefined) {
      return {
        statusCode: 200,
        body: buyTx.length > 0
      }
    }
    
    if (lever) {
      return {
        statusCode: 200,
        body: buyTx.some((tx) => {
          const input = tx.input
          const txLever = parseInt(input.slice(74, 138), 16)
          return txLever === parseInt(lever)
        })
      }
    }
    
    if (amount) {
      return {
        statusCode: 200,
        body: buyTx.some((tx) => {
          const input = tx.input
          const txAmount = parseInt(input.slice(202, 266), 16) / 1e18
          return txAmount >= parseInt(amount)
        })
      }
    }
    
    if (total) {
      const totalAmount = buyTx.reduce((acc, tx) => {
        const input = tx.input
        const txAmount = parseInt(input.slice(202, 266), 16) / 1e18
        return acc + txAmount
      })
      return {
        statusCode: 200,
        body: totalAmount >= parseInt(total)
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
    body: false,
  };
};