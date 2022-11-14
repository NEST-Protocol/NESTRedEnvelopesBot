const axios = require("axios");

const bearToken = process.env.BEAR_TOKEN

exports.handler = async (event) => {
  const tweet = event?.queryStringParameters?.tweet ?? undefined
  const twitter = JSON.parse(event?.body)?.twitter ?? undefined
  
  if (tweet === undefined || twitter === undefined) {
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
    
    const req = await axios({
      method: 'GET',
      url: `https://api.twitter.com/2/users/by/username/${twitter}`,
      headers: {
        'Authorization': `Bearer ${twitterToken}`
      }
    })
    const twitterId = req.data.data.id
  
    const [liked, retweeted] = await Promise.all([
      axios({
        method: 'GET',
        url: `https://api.twitter.com/2/users/${twitterId}/liked_tweets`,
        headers: {
          'Authorization': `Bearer ${twitterToken}`
        }
      }),
      axios({
        method: 'GET',
        url: `https://api.twitter.com/2/users/${twitterId}/tweets?expansions=referenced_tweets.id.author_id`,
        headers: {
          'Authorization': `Bearer ${twitterToken}`
        }
      })
    ])
  
    const liked_list = liked.data.data || []
    const retweeted_list = retweeted.data.data || []
    const isLike = liked_list.some((item) => item.id === tweet)
    const isRetweet = retweeted_list.some((item) => item.referenced_tweets && item.referenced_tweets[0].id === tweet)
    if (!isLike || !isRetweet) {
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