const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const {DynamoDBDocumentClient, GetCommand} = require("@aws-sdk/lib-dynamodb");
const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  const chat_id = event?.queryStringParameters?.chat_id ?? undefined
  const message_id = event?.queryStringParameters?.message_id ?? undefined
  
  if (chat_id === undefined && message_id === undefined) {
    return {
      statusCode: 200,
      body: "You need to provide a chat_id and message_id"
    }
  }
  
  try {
    const result = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize',
      Key: {
        chat_id: BigInt(chat_id),
        message_id: BigInt(message_id),
      }
    }))
    if (result.Item === undefined) {
      return {
        statusCode: 200,
        body: "No prize found"
      }
    }
    // return a csv file
    return {
      statusCode: 200,
      body: `id,username,wallet,amount
${result.Item.record.map((i, index) => `${result.Item.record.length - index},@${i.username},${i.wallet},${i.amount},`).join("\n")}
`,
      headers: {
        'Content-Type': 'text/csv',
      }
    }
  } catch (e) {
    return {
      statusCode: 200,
      body: "Some error occurred."
    }
  }
};
