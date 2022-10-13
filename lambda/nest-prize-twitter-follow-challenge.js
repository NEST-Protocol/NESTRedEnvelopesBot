const axios = require("axios");

const bearToken = process.env.BEAR_TOKEN

exports.handler = async (event) => {
  const target = event?.queryStringParameters?.target ?? undefined
  const twitter = JSON.parse(event?.body)?.twitter ?? undefined
  
  if (target === undefined || twitter === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  try {
    const twitterTokenReq = await axios({
      method: 'GET',
      url: `https://work.parasset.top/workbench-api/twitter/token`,
      headers: {
        'Authorization': `Bearer ${bearToken}`
      }
    })
    const twitterToken = twitterTokenReq.data?.data || undefined
  
    if (twitterToken === undefined) {
      return {
        statusCode: 200,
        body: false
      }
    }
    
    const [targetReq, twitterReq] = await Promise.all([
      axios({
        method: 'GET',
        url: `https://api.twitter.com/2/users/by/username/${target}`,
        headers: {
          'Authorization': `Bearer ${twitterToken}`
        }
      }),
      axios({
        method: 'GET',
        url: `https://api.twitter.com/2/users/by/username/${twitter}`,
        headers: {
          'Authorization': `Bearer ${twitterToken}`
        }
      })
    ])
    
    const targetId = targetReq.data.data.id || undefined
    const twitterId = twitterReq.data.data.id || undefined
    
    if (targetId === undefined || twitterId === undefined) {
      return {
        statusCode: 200,
        body: false
      }
    }
    const req = await axios({
      method: 'GET',
      url: `https://api.twitter.com/2/users/${twitterId}/following?max_results=1000`,
      headers: {
        'Authorization': `Bearer ${twitterToken}`
      }
    })
    const following = req.data.data || []
    const isFollowing = following.some((item) => item.id === targetId)
    if (!isFollowing) {
      return {
        statusCode: 200,
        body: false,
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
    body: true,
  };
};