const {QueryCommand, UpdateCommand, DynamoDBDocumentClient} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const fs = require('fs')

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const main = async () => {
  try {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: 'nest-prize',
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'pending',
      },
    }))
    console.log("Count:", result.Count)
    
    if (result.Count === 0) {
      return
    }
    
    let pendingList = []
    for (const item of result.Items) {
      let walletMap = {}
      let amount = 0
      for (const user of item.record.slice(0, item.config.quantity)) {
        if (walletMap[user.wallet.toLowerCase()]) {
          continue
        }
        walletMap[user.wallet.toLowerCase()] = true
        const index = pendingList.findIndex((i) => i.wallet.toLowerCase() === user.wallet.toLowerCase())
        if (index === -1) {
          if (user.amount > 0 && (amount + user.amount) <= item.config.amount) {
            amount += user.amount
            pendingList.push(user)
          }
        } else {
          if (user.amount > 0 && (amount + user.amount) <= item.config.amount) {
            amount += user.amount
            pendingList[index].amount += user.amount
          }
        }
      }
    }
    
    if (pendingList.length === 0) {
      console.log("No pending NEST Prize found to send.")
      return
    }
    
    for (const item of result.Items) {
      ddbDocClient.send(new UpdateCommand({
        TableName: 'nest-prize',
        Key: {
          chat_id: item.chat_id,
          message_id: item.message_id,
        },
        UpdateExpression: 'SET #s = :s, #t = :t',
        ConditionExpression: '#s = :ps',
        ExpressionAttributeNames: {
          '#s': 'status',
          '#t': 'ttl',
        },
        ExpressionAttributeValues: {
          ':s': 'processing',
          ':t': Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
          ':ps': 'pending',
        },
      })).then(() => {
        console.log("Updated status to processing for", item.chat_id, item.message_id)
      }).catch((e) => {
        console.log(e)
      })
    }
    
    try {
      let data = 'address,amount\n'
      for (const item of pendingList) {
        data += `${item.wallet},${item.amount}\n`
      }
      // save data to csv
      fs.writeFileSync('/Users/teihate/Desktop/nest-prize.csv', data)
      
    } catch (e) {
      console.log("Send csv file failed, please try again later.")
    }
  } catch (e) {
    console.log("Fetch pending NEST Prize failed, please try again later.")
  }
}

main()