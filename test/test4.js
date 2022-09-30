// Move data from nest-red-envelopes to nest-prize-users and nest-prize
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const {DynamoDBDocumentClient, ScanCommand, BatchWriteCommand} = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// nest-prize-users
// query index of user-index, get all users
const fetchAllUsers = async () => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    IndexName: 'user-index',
    Limit: 2000,
    ExclusiveStartKey: {
      id: 26770327455400960n,
      user_id: 1598146913
    }
  })).catch((e) => {
    console.log(e)
  })
  console.log(result)
  
  const batchWrite = async (items) => {
    await ddbDocClient.send(new BatchWriteCommand({
      RequestItems: {
        'nest-prize-users': items,
      }
    })).then((res) => {
      console.log('批量插入:', items.length, result.$metadata.httpStatusCode)
    }).catch((e) => {
      console.log(e)
    })
  }
  
  let items = []
  for (const item of result.Items) {
    items.push({
      PutRequest: {
        Item: item,
      }
    })
    if (items.length === 25 || item === result.Items[result.Items.length - 1]) {
      await batchWrite(items)
      items = []
      // sleep 5 seconds
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, 5000)
      })
    }
  }
}


// nest-prize
// query index of red-envelope-index, get all red envelopes

const fetchAllRedEnvelopes = async () => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    IndexName: 'red-envelope-index',
    Limit: 100,
  })).catch((e) => {
    console.log(e)
  })
  console.log(result.Count)
  
  // batch write to nest-prize, every 25 items
  const batchWrite = async (items) => {
    const result = await ddbDocClient.send(new BatchWriteCommand({
      RequestItems: {
        'nest-prize': items,
      }
    })).catch((e) => {
      console.log(e)
    })
    console.log(result)
    console.log('批量插入:', items.length)
  }
  
  let items = []
  for (const item of result.Items) {
    items.push({
      PutRequest: {
        Item: item,
      }
    })
    if (items.length === 25 || item === result.Items[result.Items.length - 1]) {
      await batchWrite(items)
      items = []
    }
  }
  console.log('done')
}

fetchAllUsers()