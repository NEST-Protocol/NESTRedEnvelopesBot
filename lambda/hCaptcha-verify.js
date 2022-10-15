const axios = require("axios");
const qs = require('qs');
const {UpdateCommand, DynamoDBDocumentClient} = require("@aws-sdk/lib-dynamodb");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const secret = process.env.SECRET

exports.handler = async (event) => {
  const token = JSON.parse(event?.body)?.token ?? undefined
  const user_id = JSON.parse(event?.body)?.user_id ?? undefined
  
  if (token === undefined || user_id === undefined || secret === undefined) {
    return {
      statusCode: 200,
      body: "Invalid request. Need token and user_id."
    }
  }
  
  try {
    const req = await axios({
      method: "POST",
      url: "https://hcaptcha.com/siteverify",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: qs.stringify({
        response: token,
        secret: secret
      })
    })
    const res = req.data.success
    if (res) {
      await ddbDocClient.send(new UpdateCommand({
        TableName: "nest-prize-users",
        Key: {
          user_id: Number(user_id)
        },
        UpdateExpression: "set hCaptcha = :hCaptcha",
        ExpressionAttributeValues: {
          ":hCaptcha": true
        }
      }))
      
      return {
        statusCode: 200,
        body: "Success!",
      };
    } else {
      return {
        statusCode: 200,
        body: "Error!",
      };
    }
  } catch (e) {
    return {
      statusCode: 200,
      body: "Error!",
    };
  }
};
