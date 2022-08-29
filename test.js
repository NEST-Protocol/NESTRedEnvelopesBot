const {ScanCommand, DynamoDBDocumentClient, QueryCommand} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const test = async () => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    FilterExpression: 'creator = :creator',
    ExpressionAttributeValues: {
      ':creator': 21304939510,
    }
  }))
  // calculate result  Items.config.amount
  const total = result.Items.reduce((acc, cur) => acc + cur.config.amount, 0)
  console.log(total)
}

test()