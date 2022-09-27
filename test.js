const {ethers} = require("ethers");
const {ScanCommand, DynamoDBDocumentClient} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");

const main = async () => {
  const ddbClient = new DynamoDBClient({
    region: 'ap-northeast-1',
  });
  
  const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    FilterExpression: '#s = :s',
    ExpressionAttributeNames: {
      '#s': 'status',
    },
    ExpressionAttributeValues: {
      ':s': 'pending',
    },
  })).catch(() => {
    ctx.answerCbQuery("Fetch pending NEST Prize failed, please try again later.")
    ctx.reply("Fetch pending NEST Prize failed, please try again later.")
  });
  let pendingList = []
  for (const item of result.Items) {
    for (const user of item.record) {
      const index = pendingList.findIndex((i) => i.wallet === user.wallet)
      if (index === -1) {
        if (user.amount > 0) {
          pendingList.push(user)
        }
      } else {
        if (user.amount > 0) {
          pendingList[index].amount += user.amount
        }
      }
    }
  }
  console.log('pendingList', pendingList)
}

main()
