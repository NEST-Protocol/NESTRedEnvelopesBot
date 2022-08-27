const {Telegraf, Markup, session} = require('telegraf')
const {PutCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {Snowflake} = require('nodejs-snowflake');
const {isAddress} = require("ethers/lib/utils");

//
//    #####
//   #     #  ####  #    # ###### #  ####
//   #       #    # ##   # #      # #    #
//   #       #    # # #  # #####  # #
//   #       #    # #  # # #      # #  ###
//   #     # #    # #   ## #      # #    #
//    #####   ####  #    # #      #  ####
//
const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const uid = new Snowflake({
  custom_epoch: 1656604800000,
  instance_id: 1,
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const token = process.env.BOT_TOKEN
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

const bot = new Telegraf(token)
bot.use(session())

//
//    #####
//   #     # #####   ##   #####  #####
//   #         #    #  #  #    #   #
//    #####    #   #    # #    #   #
//         #   #   ###### #####    #
//   #     #   #   #    # #   #    #
//    #####    #   #    # #    #   #
//
bot.start(async (ctx) => {
  // Todo: check user info in dynamodb
  const chat_id = ctx.chat.id;
  if (chat_id < 0) {
    return
  }
  await replyL1MenuContent(ctx)
})

//
//   #         #      #     #
//   #        ##      ##   ## ###### #    # #    #
//   #       # #      # # # # #      ##   # #    #
//   #         #      #  #  # #####  # #  # #    #
//   #         #      #     # #      #  # # #    #
//   #         #      #     # #      #   ## #    #
//   ####### #####    #     # ###### #    #  ####
//
const replyL1MenuContent = async (ctx) => {
  ctx.reply(`Welcome to NEST Red Envelopes!`, Markup.inlineKeyboard([
    [Markup.button.callback('Send Red Envelopes', 'config')],
    [Markup.button.callback('History', 'history')],
    [Markup.button.callback('Wallet', 'wallet')],
  ]))
}

const editReplyL1MenuContent = async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.editMessageText('Welcome to NEST Red Envelopes Bot!', Markup.inlineKeyboard([
    [Markup.button.callback('Send Red Envelopes', 'config')],
    [Markup.button.callback('History', 'history')],
    [Markup.button.callback('Wallet', 'wallet')],
  ]))
}

bot.command('menu', replyL1MenuContent)
bot.action('backToL1MenuContent', editReplyL1MenuContent)

// L2 Config Red Envelope
bot.action('config', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.editMessageText(`Enter red envelope config with json format.
  
*parameters:*
quantity: number of red envelopes
token: token address
amount: amount of all red envelopes
max: max amount of each red envelope
min: min amount of each red envelope
text: best wishes
chatId: target chatId

For example: {"quantity": 10, "token": "NEST", "amount": 20, "max": 10, "min": 1, "text": "This is a NEST Red Envelope. @NESTRedEnvelopesBot", "chatId": "@nesttestredenvelopes"}`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'backToL1MenuContent')],
    ])
  })
  ctx.session = {intent: 'config'}
})

// L3 send
bot.action('send', async (ctx) => {
  const config = ctx.session?.config
  if (config) {
    try {
      // send message to chat_id, record chat_id and message_id to dynamodb
      const res = await ctx.telegram.sendMessage(config.chatId, `${config.text}

How to snatch this red envelope:
1. ☝️ FIRST TIME: reply your wallet address in the group directly!
2. 🚀 FASTER: click bottom Snatch button!
3. 🤑 RECOMMEND: pay attention to this robot.`, {
        protect_content: true,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Snatch!', 'snatch')],
        ])
      })
      const message_id = res.message_id
      const chat_id = res.chat.id
      if (message_id && chat_id) {
        await ddbDocClient.send(new PutCommand({
          TableName: 'nest-red-envelopes',
          Item: {
            id: uid.getUniqueID(),  // snowflake id
            chat_id,
            message_id,
            config,
            balance: config.amount, // left balance of red envelopes
            status: 'open', // open, pending, closed
            from: ctx.from,
            created_at: new Date().getTime(),
            updated_at: new Date().getTime(),
            record: [],
          },
        }))
        await ctx.reply('Red Envelopes Sent Success!')
      }
    } catch (e) {
      ctx.reply('Sorry, I cannot send message to target chat.')
    }
  } else {
    ctx.reply('Sorry, I cannot understand your config. Please try again.')
  }
})

bot.action('snatch', async (ctx) => {
  // check user info in dynamodb
  const queryUserRes = await ddbDocClient.send(new QueryCommand({
    ExpressionAttributeNames: {'#user': 'user_id'},
    TableName: 'nest-red-envelopes',
    IndexName: 'user-index',
    KeyConditionExpression: '#user = :user',
    ExpressionAttributeValues: {
      ':user': ctx.update.callback_query.from.id,
    },
  }));
  // If no user info do nothing.
  if (queryUserRes.Count === 0) {
    await ctx.answerCbQuery('Please reply your wallet address in the group directly!')
    return
  }
  const queryRedEnvelopeRes = await ddbDocClient.send(new QueryCommand({
    ExpressionAttributeNames: {'#chat_id': 'chat_id', '#message_id': 'message_id'},
    TableName: 'nest-red-envelopes',
    IndexName: 'red-envelope-index',
    KeyConditionExpression: '#chat_id = :chat_id AND #message_id = :message_id',
    ExpressionAttributeValues: {
      ':chat_id': ctx.update.callback_query.message.chat.id,
      ':message_id': ctx.update.callback_query.message.message_id,
    },
  }))
  if (queryUserRes.Count === 0) {
    ctx.reply('I do not have this red envelope info. Please try again.')
    return
  }
  const redEnvelop = queryRedEnvelopeRes.Items[0]
  if (redEnvelop.record.some(record => record.user_id === ctx.update.callback_query.from.id)) {
    await ctx.answerCbQuery('You have already snatched this red envelope!')
    return
  }
  // check if red envelope is open
  if (redEnvelop.status !== 'open') {
    ctx.reply(`Sorry, you are late. ${redEnvelop.config.amount} NEST have been given away.
Please pay attention to the group news. Good luck next time.`, {
      reply_to_message_id: ctx.update.callback_query.message.message_id,
    })
    return
  }
  // can snatch
  let status = 'open', amount
  // check if red envelope is need empty
  if (redEnvelop.record.length === redEnvelop.config.quantity - 1) {
    status = 'pending'
    amount = redEnvelop.balance
  } else {
    // get random amount
    amount = Math.floor(Math.random() * (Math.min(redEnvelop.config.max, redEnvelop.balance) - redEnvelop.config.min + 1) + redEnvelop.config.min)
    // check if red envelope is enough
    if (redEnvelop.balance === amount) {
      status = 'pending'
    }
  }
  // update red envelope info in dynamodb
  await ddbDocClient.send(new UpdateCommand({
    TableName: 'nest-red-envelopes',
    Key: {id: redEnvelop.id},
    UpdateExpression: 'set balance = balance - :amount, updated_at = :updated_at, #record = list_append(#record, :record), #status = :status',
    ExpressionAttributeNames: {'#record': 'record', '#status': 'status'},
    ExpressionAttributeValues: {
      ':amount': amount,
      ':updated_at': new Date().getTime(),
      ':record': [{
        user_id: ctx.update.callback_query.from.id,
        amount,
        created_at: new Date().getTime(),
      }],
      ':status': status,
    }
  }))
  
  await ctx.answerCbQuery(`Congratulations, you have got ${amount} NEST.`)
  ctx.reply(`Congratulations, ${ctx.update.callback_query.from.username ?? ctx.update.callback_query.from.id} have got ${amount} NEST.

Left ${Number(redEnvelop.balance) - amount} NEST!`, {
    reply_to_message_id: ctx.update.callback_query.message.message_id,
  })
})

bot.on('message', async (ctx) => {
  const chat_id = ctx.message.chat.id
  const input = ctx.message.text
  // group message
  if (chat_id < 0) {
    if (isAddress(input)) {
      // update wallet address in dynamodb
      const queryUserRes = await ddbDocClient.send(new QueryCommand({
        ExpressionAttributeNames: {'#user_id': 'user_id'},
        TableName: 'nest-red-envelopes',
        IndexName: 'user-index',
        KeyConditionExpression: '#user_id = :user_id',
        ExpressionAttributeValues: {
          ':user_id': ctx.message.from.id,
        },
      }));
      if (queryUserRes.Count === 0) {
        await ddbDocClient.send(new PutCommand({
          TableName: 'nest-red-envelopes',
          Item: {
            id: uid.getUniqueID(),  // snowflake id
            user_id: ctx.message.from.id,
            wallet: input,
            created_at: new Date().getTime(),
            updated_at: new Date().getTime(),
          },
        })).catch(() => {
          ctx.reply('Sorry, I cannot save your wallet. Please try again.')
        })
      }
      // auto snatch red envelope
      const queryRedEnvelopeRes = await ddbDocClient.send(new QueryCommand({
        ExpressionAttributeNames: {'#chat_id': 'chat_id', '#message_id': 'message_id', '#status': 'status'},
        TableName: 'nest-red-envelopes',
        IndexName: 'red-envelope-index',
        KeyConditionExpression: '#chat_id = :chat_id AND #message_id < :message_id AND #status = :status',
        ScanIndexForward: false,
        ExpressionAttributeValues: {
          ':chat_id': ctx.message.chat.id,
          ':message_id': ctx.message.message_id,
          ':status': 'open',
        },
      }))
      if (queryRedEnvelopeRes.Count === 0) {
        ctx.reply('There is none red envelope in this group.')
        return
      }
      const redEnvelop = queryRedEnvelopeRes.Items[0]
      if (redEnvelop.record.some(record => record.user_id === ctx.from.id)) {
        await ctx.answerCbQuery('You have already snatched the latest red envelope!')
        return
      }
      // check if red envelope is open
      if (redEnvelop.status !== 'open') {
        ctx.reply(`Sorry, you are late. ${redEnvelop.config.amount} NEST have been given away.
Please pay attention to the group news. Good luck next time.`, {
          reply_to_message_id: ctx.message.message_id,
        })
        return
      }
      let status = 'open', amount
      // check if red envelope is need empty
      if (redEnvelop.record.length === redEnvelop.config.quantity - 1) {
        status = 'pending'
        amount = redEnvelop.balance
      } else {
        // get random amount
        amount = Math.floor(Math.random() * (Math.min(redEnvelop.config.max, redEnvelop.balance) - redEnvelop.config.min + 1) + redEnvelop.config.min)
        // check if red envelope is enough
        if (redEnvelop.balance === amount) {
          status = 'pending'
        }
      }
      // update red envelope info in dynamodb
      await ddbDocClient.send(new UpdateCommand({
        TableName: 'nest-red-envelopes',
        Key: {id: redEnvelop.id},
        UpdateExpression: 'set balance = balance - :amount, updated_at = :updated_at, #record = list_append(#record, :record), #status = :status',
        ExpressionAttributeNames: {'#record': 'record', '#status': 'status'},
        ExpressionAttributeValues: {
          ':amount': amount,
          ':updated_at': new Date().getTime(),
          ':record': [{
            user_id: ctx.from.id,
            amount,
            created_at: new Date().getTime(),
          }],
          ':status': status,
        }
      }))
  
      await ctx.answerCbQuery(`Congratulations, you have got ${amount} NEST.`)
      ctx.reply(`Congratulations, ${ctx.from.username ?? ctx.from.id} have got ${amount} NEST.

Left ${redEnvelop.balance - amount} NEST!`, {
        reply_to_message_id: ctx.message.message_id,
      })
    }
  }
  // DM message
  else {
    const intent = ctx.session?.intent
    if (intent === 'config') {
      try {
        const config = JSON.parse(ctx.message.text)
        await ctx.reply(`Check it again:

quantity: ${config.quantity},
token: ${config.token},
amount: ${config.amount},
max: ${config.max},
min: ${config.min},
text: ${config.text},
chatId: ${config.chatId}
`, Markup.inlineKeyboard([
              [Markup.button.callback('Checked, Send Now!', 'send')],
              [Markup.button.callback('« Back', 'backToL1MenuContent')],
            ])
        )
        ctx.session = {intent: undefined, config: config}
      } catch (e) {
        ctx.reply('Sorry, I cannot understand your config. Please try again.')
      }
    }
  }
})

//
//   #     #
//   #     #   ##   #    # #####  #      ######
//   #     #  #  #  ##   # #    # #      #
//   ####### #    # # #  # #    # #      #####
//   #     # ###### #  # # #    # #      #
//   #     # #    # #   ## #    # #      #
//   #     # #    # #    # #####  ###### ######
//
exports.handler = async (event, context, callback) => {
  const tmp = JSON.parse(event.body);
  await bot.handleUpdate(tmp);
  return callback(null, {
    statusCode: 200,
    body: '',
  });
};