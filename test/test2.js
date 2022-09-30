const {ScanCommand, DynamoDBDocumentClient} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

(async () => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    IndexName: 'red-envelope-index',
    FilterExpression: 'creator = :creator',
    ExpressionAttributeValues: {
      ':creator': 2130493951,
    }
  })).catch((e) => {
    console.log(e)
  })
  console.log(result)
})();
