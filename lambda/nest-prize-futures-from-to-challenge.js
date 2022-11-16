const axios = require("axios");

const apiKey = process.env.APIKEY
const botToken = process.env.BOT_TOKEN

exports.handler = async (event) => {
  const wallet = JSON.parse(event?.body)?.wallet ?? undefined
  const total = event?.queryStringParameters?.total ?? undefined
  const from = event?.queryStringParameters?.from ?? undefined
  const to = event?.queryStringParameters?.to ?? undefined
  const chat_id = event?.queryStringParameters?.chat_id ?? undefined
  
  if (wallet === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  if (!chat_id) {
    try {
      const res = await axios({
        method: 'get',
        timeout: 3000,
        url: `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chat_id}&user_id=${user_id}`
      })
    
      if (res.data?.result?.status === 'left') {
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
  }
  
  try {
    const req = await axios({
      method: 'GET',
      url: `https://api.bscscan.com/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`,
    })
    const data = req.data.result || []
    const buyTx = data.filter((tx) => {
      const txDate = new Date(tx.timeStamp * 1000)
      return tx.methodId === '0x15ee0aad' &&
          tx.isError === '0' &&
          tx.to.toLowerCase() === "0x8e32C33814271bD64D5138bE9d47Cd55025074CD".toLowerCase() &&
          txDate < new Date(to) &&
          txDate > new Date(from)
    })
    
    if (buyTx.length === 0) {
      return {
        statusCode: 200,
        body: false
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