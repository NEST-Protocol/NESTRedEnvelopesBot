const postgres = require('postgres')
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const {DynamoDBDocumentClient, UpdateCommand} = require("@aws-sdk/lib-dynamodb");
const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const sql = postgres({
  host: 'localhost',
  port: 55000,
  user: 'postgres',
  password: 'postgrespw',
  database: 'postgres'
});


const main = async () => {
  const result = await sql`SELECT *
                           FROM "nest-prize-user"
                           WHERE ip like '103.155.118.161'`
  
  for (const item of result) {
    // timeout 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: BigInt(item.user_id),
      },
      UpdateExpression: 'SET #b = :b',
      ExpressionAttributeNames: {
        '#b': 'blocked',
      },
      ExpressionAttributeValues: {
        ':b': false,
      }
    })).catch((e) => console.log(e))
        .then((e) => console.log('unblock:', item.user_id))
  }
}

main()