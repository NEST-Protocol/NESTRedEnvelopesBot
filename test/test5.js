const {ScanCommand, DynamoDBDocumentClient, QueryCommand} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

(async () => {
  const [openResult, pendingResult, processingResult] = await Promise.all([
    ddbDocClient.send(new QueryCommand({
      TableName: 'nest-prize',
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'open',
      },
    })),
    ddbDocClient.send(new QueryCommand({
      TableName: 'nest-prize',
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'pending',
      },
    })),
    ddbDocClient.send(new QueryCommand({
      TableName: 'nest-prize',
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'processing',
      },
    })),
  ])
  console.log(openResult, pendingResult, processingResult)
})();