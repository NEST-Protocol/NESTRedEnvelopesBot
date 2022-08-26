const {Telegraf, Markup, session} = require('telegraf')
const {PutCommand, DynamoDBDocumentClient, GetCommand} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {ethers} = require("ethers")

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
    [Markup.button.callback('Send Red Envelopes', 'send')],
    [Markup.button.callback('History', 'history')],
    [Markup.button.callback('Wallet', 'wallet')],
  ]))
}

const editReplyL1MenuContent = async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.editMessageText('Welcome to NEST Red Envelopes Bot!', Markup.inlineKeyboard([
    [Markup.button.callback('Send Red Envelopes', 'start')],
    [Markup.button.callback('History', 'history')],
    [Markup.button.callback('Wallet', 'wallet')],
  ]))
}

bot.command('menu', replyL1MenuContent)
bot.action('backToL1MenuContent', editReplyL1MenuContent)

// L2 Send
bot.action('send', async (ctx) => {
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

For example: {"quantity": 10, "token": "NEST", "amount": 20, "max": 10, "min": 1, "text": "NEST Red Envelopes", "chatId": "@nesttestredenvelopes"}`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'backToL1MenuContent')],
    ])
  })
  ctx.session = {intent: 'config'}
})

bot.on('message', async (ctx) => {
  const intent = ctx.session?.intent
  if (intent === 'config') {
    try {
      const config = JSON.parse(ctx.message.text)
      await ctx.reply(`Check it again:

quantity: ${config.quantity},
token: ${config.token},
amount: ${config.amount},
max: ${ config.max},
min: ${config.min},
text: ${config.text},
chatId: ${config.chatId}
`, Markup.inlineKeyboard([
            [Markup.button.callback('Checked, Send Now!', 'sendNow')],
            [Markup.button.callback('« Back', 'backToL1MenuContent')],
          ])
      )
      ctx.session = {intent: undefined, config: config}
    } catch (e) {
      ctx.reply('Sorry, I cannot understand your config. Please try again.')
    }
  } else {
    ctx.reply('Hello!')
  }
})

// L3 SendNow
bot.action('sendNow', async (ctx) => {
  const config = ctx.session?.config
  if (config) {
    // 保存红包信息到数据库
    // 发送信息到target
    try {
      const res = await ctx.telegram.sendMessage(config.chatId, config.text, {
        protect_content: true,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Snatch!', 'snatch')],
        ])
      })
      const message_id = res.message_id
      const chat_id = res.chat.id
      console.log(chat_id, message_id)
    } catch (e) {
      ctx.reply('Sorry, I cannot send message to target chat.')
    }
  } else {
    ctx.reply('Sorry, I cannot understand your config. Please try again.')
  }
})

bot.action('snatch', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply(`Congratulations, ${ctx.update.callback_query.from.username ?? ctx.update.callback_query.from.id} have got XX $NEST.

Check your wallet address now!

chat_id: ${ctx.update.callback_query.message.chat.id}
message_id: ${ctx.update.callback_query.message.message_id}
`, {
    reply_to_message_id: ctx.update.callback_query.message.message_id,
  })
  // Sorry, you are late. XXX $NEST have been given away.
  // Please pay attention to the group news. Good luck next time.
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