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
  console.log(result.Items.length)
  let pendingList = []
  for (const item of result.Items) {
    pendingList.push.apply(pendingList, item.record.filter(r => r.amount > 0))
  }
  // // save pendingList to csv file
  // const fs = require('fs');
  // fs.writeFileSync('pendingList.csv', pendingList.map((i) => `${i.wallet},${i.amount}`).join('\n'));
}

main()
