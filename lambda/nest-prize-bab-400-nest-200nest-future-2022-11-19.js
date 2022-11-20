const axios = require("axios");

exports.handler = async (event) => {
  const wallet = JSON.parse(event?.body)?.wallet ?? undefined
  const lever = event?.queryStringParameters?.lever ?? "5"
  const total = event?.queryStringParameters?.total ?? "200"
  const from = event?.queryStringParameters?.from ?? "2022-11-19"
  const minute = event?.queryStringParameters?.minute ?? "5"
  const nest_min_value = event?.queryStringParameters?.nest ?? "400"
  
  if (wallet === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  try {
    const res = await Promise.all([
      axios(`https://lqccmohjauzfdjw3b5xyq452f40uhghw.lambda-url.ap-northeast-1.on.aws/?nest=${nest_min_value}`, {
        method: 'POST',
        data: JSON.stringify({
          "wallet": wallet,
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      }),
      axios(`https://work.parasset.top/workbench-api/bot/futures/position?from=${from}&to=2022-12-30&level=${lever}&minute=${minute}&total=${total}`, {
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