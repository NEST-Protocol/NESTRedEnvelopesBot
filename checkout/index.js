const {PutCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand, ScanCommand} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {Snowflake} = require('nodejs-snowflake');
const {isAddress} = require("ethers/lib/utils");

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  // scan nest-red-envelopes where status = 'pending'
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    FilterExpression: '#s = :s',
    ExpressionAttributeNames: {
      '#s': 'status',
    },
    ExpressionAttributeValues: {
      ':s': 'pending',
    },
  }));

  // for (const item of result.Items) {
  //   await ddbDocClient.send(new UpdateCommand({
  //     TableName: 'nest-red-envelopes',
  //     Key: {
  //       id: item.id,
  //     },
  //     UpdateExpression: 'SET #s = :s',
  //     ExpressionAttributeNames: {
  //       '#s': 'status',
  //     },
  //     ExpressionAttributeValues: {
  //       ':s': 'processing',
  //     },
  //   }));
  // }
  
  let pendingList = []
  for (const item of result.Items) {
    pendingList.push.apply(pendingList, item.record)
  }
  console.log(pendingList)
  
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  return response;
};
