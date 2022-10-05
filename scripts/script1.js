// check BAB and NEST balance
const {ScanCommand, DynamoDBDocumentClient, UpdateCommand} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const axios = require("axios");

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const ScanUsers = async () => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-prize-users',
    IndexName: 'invite-code-index',
    Limit: 10,
  })).catch((e) => {
    console.log(e)
  })
  // console.log(result)
  for (const item of result.Items) {
    if (!item?.wallet) {
      continue
    }
    // get have 200 NEST and 1 BAB
    try {
      const res = await axios({
        method: 'POST',
        url: 'https://lqccmohjauzfdjw3b5xyq452f40uhghw.lambda-url.ap-northeast-1.on.aws/?nest=0',
        data: JSON.stringify({
          wallet: item.wallet,
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      })
      if (res.data) {
        await ddbDocClient.send(new UpdateCommand({
          TableName: 'nest-prize-users',
          Key: {
            user_id: item.user_id,
          },
          UpdateExpression: 'set #bnb = true',
        }))
      }
      console.log(res.data)
    } catch (e) {
      console.log(e)
    }
  }
  // console.log(result.LastEvaluatedKey)
}

ScanUsers()