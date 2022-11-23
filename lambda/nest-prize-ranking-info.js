const axios = require("axios");

exports.handler = async () => {
  try {
    const res = await axios({
      method: 'get',
      timeout: 3000,
      url: `https://work.parasset.top/workbench-api/activity/info/integral/ranking`,
      headers: {
        "Authorization": `Bearer ${process.env.BEAR_TOKEN}`
      }
    })
    
    if (res.data) {
      return {
        statusCode: 200,
        body: `
Ranking:

${res.data.data.map((i, index) => `${index + 1}. ${i.wallet.slice(0, 6)}...${i.wallet.slice(-4, -1)} total: ${i.total}`).join("\n")}
`
      }
    } else {
      return {
        statusCode: 200,
        body: "No data"
      }
    }
  } catch (e) {
    return {
      statusCode: 200,
      body: "Error, please try again later."
    }
  }
}
;
