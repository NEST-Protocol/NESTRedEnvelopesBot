const {GetCommand, DynamoDBDocumentClient} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

(async () => {
  const queryUserRes = await ddbDocClient.send(new GetCommand({
    TableName: 'nest-prize-users',
    Key: {
      user_id: 123456,
    },
  })).catch((e) => {
    console.log(e)
    ctx.answerCbQuery("Some error occurred, please try again later.")
  })
  console.log(queryUserRes)
})();

