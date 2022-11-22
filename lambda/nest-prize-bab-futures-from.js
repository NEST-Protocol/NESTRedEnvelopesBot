const axios = require("axios");

exports.handler = async (event) => {
  const wallet = JSON.parse(event?.body)?.wallet ?? undefined
  const lever = event?.queryStringParameters?.lever ?? "5"
  const total = event?.queryStringParameters?.total ?? "200"
  const date = event?.queryStringParameters?.date ?? "2022-11-19"
  const minute = event?.queryStringParameters?.minute ?? "5"
  
  if (wallet === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  try {
    const res = await Promise.all([
      axios(`https://lqccmohjauzfdjw3b5xyq452f40uhghw.lambda-url.ap-northeast-1.on.aws/?nest=0`, {
        method: 'POST',
        data: JSON.stringify({
          "wallet": wallet,
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      }),
      axios(`https://work.parasset.top/workbench-api/bot/futures/open?level=${lever}&minute=${minute}&total=${total}&date=${date}`, {
        method: 'POST',
        data: JSON.stringify({
          "wallet": wallet,
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      })
    ])
    
    if (!res[0].data || !res[1].data) {
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
  
  return {
    statusCode: 200,
    body: true,
  };
};