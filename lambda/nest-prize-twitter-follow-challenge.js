const axios = require("axios");

const bearToken = process.env.BEAR_TOKEN

exports.handler = async (event) => {
  const target = event.queryStringParameters?.target ?? undefined
  const twitter = JSON.parse(event?.body)?.twitter ?? undefined
  
  if (target === undefined || twitter === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  try {
    const req = await axios({
      method: 'GET',
      url: `https://api.twitter.com/2/users/by/username/${twitter}`,
      headers: {
        'Authorization': `Bearer ${bearToken}`
      }
    })
    const twitterId = req.data.data.id
    
    try {
      const req = await axios({
        method: 'GET',
        url: `https://api.twitter.com/2/users/:id/following?max_results=1000`,
        headers: {
          'Authorization': `Bearer ${bearToken}`
        }
      })
      
      const following = req.data.data || []
      const isFollowing = following.some((item) => item.id === target)
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