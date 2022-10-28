const axios = require("axios");

const botToken = process.env.BOT_TOKEN
exports.handler = async (event) => {
  const user_id = JSON.parse(event.body)?.user_id ?? undefined
  const chat_id = event?.queryStringParameters?.chat_id ?? undefined
  
  if (user_id === undefined && chat_id === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
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
  
  return {
    statusCode: 200,
    body: true,
  };
};
