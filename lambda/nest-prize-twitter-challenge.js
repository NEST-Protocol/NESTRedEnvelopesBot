const axios = require("axios");

const bearToken = process.env.BEAR_TOKEN

exports.handler = async (event) => {
  const tweet = event.queryStringParameters?.tweet ?? undefined
  const twitter = JSON.parse(event?.body)?.twitter ?? undefined
  
  if (tweet === undefined || twitter === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  let twitterId, isLike, isRetweet
  
  try {
    const req = await axios({
      method: 'GET',
      url: `https://api.twitter.com/2/users/by/username/${twitter}`,
      headers: {
        'Authorization': `Bearer ${bearToken}`
      }
    })
    twitterId = req.data.data.id
  } catch (e) {
    return {
      statusCode: 200,
      body: false,
    };
  }
  
  try {
    const [liked, retweeted] = await Promise.all([
      axios({
        method: 'GET',
        url: `https://api.twitter.com/2/users/${twitterId}/liked_tweets`,
        headers: {
          'Authorization': `Bearer ${bearToken}`
        }
      }),
      axios({
        method: 'GET',
        url: `https://api.twitter.com/2/users/${twitterId}/tweets?max_results=50&expansions=referenced_tweets.id.author_id`,
        headers: {
          'Authorization': `Bearer ${bearToken}`
        }
      })
    ])
    
    const liked_list = liked.data.data || []
    const retweeted_list = retweeted.data.data || []
    isLike = liked_list.some((item) => item.id === tweet)
    isRetweet = retweeted_list.some((item) => item.referenced_tweets && item.referenced_tweets[0].id === tweet)
    if (!isLike || !isRetweet) {
      return {
        statusCode: 200,
        body: false,
      };
    }
  } catch (_) {
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