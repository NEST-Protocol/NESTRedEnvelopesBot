const axios = require("axios");

const apiKey = process.env.APIKEY
exports.handler = async (event) => {
  const user_id = JSON.parse(event.body)?.user_id ?? undefined
  const wallet = JSON.parse(event.body)?.wallet ?? undefined
  
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
    
    const res = data.some((tx) => {
      return (tx.from).toLowerCase() === wallet.toLowerCase() && tx.methodId === '0x15ee0aad' && (new Date().getTime()/1000 - Number(tx.timeStamp) < 86400)
    })
    
    if (res) {
      return {
        statusCode: 200,
        body: true,
      };
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