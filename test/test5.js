const {ScanCommand, DynamoDBDocumentClient, QueryCommand} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

ddbDocClient.send(new QueryCommand({
  TableName: 'nest-prize',
  IndexName: 'status-index',
  KeyConditionExpression: '#status = :status',
  ExpressionAttributeValues: {
    ':status': 'open',
  },
  ExpressionAttributeNames: {
    '#status': 'status',
  }
})).then((res) => {
  console.log(res)
}).catch((e) => {
  console.log(e)
})