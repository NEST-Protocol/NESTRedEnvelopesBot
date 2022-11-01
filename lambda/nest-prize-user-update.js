const axios = require("axios");

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === 'MODIFY') {
      const user_id = record.dynamodb.Keys.user_id.N
      const invite_code = record.dynamodb.NewImage?.invite_code?.N || 0
      const username = record.dynamodb.NewImage?.username?.S || ''
      const wallet = record.dynamodb.NewImage?.wallet?.S || ''
      
      const old_invite_code = record.dynamodb.OldImage?.invite_code?.N || 0
      const old_username = record.dynamodb.OldImage?.username?.S || ''
      const old_wallet = record.dynamodb.OldImage?.wallet?.S || ''
      
      if (wallet === '') {
        return
      }
      
      if (invite_code !== old_invite_code || username !== old_username || wallet !== old_wallet) {
        axios({
          method: 'POST',
          url: `https://work.parasset.top/workbench-api/activity/user/update`,
          data: JSON.stringify({
                user_id,
                invite_code,
                username,
                wallet
              }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BEAR_TOKEN}`
          }
        }).catch((err) => {
          console.log(err)
        })
      }
    }
  }
};