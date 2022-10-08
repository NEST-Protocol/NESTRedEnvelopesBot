const {Telegraf, Markup, session} = require('telegraf')
const {PutCommand, DynamoDBDocumentClient, UpdateCommand, GetCommand, QueryCommand} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {isAddress} = require("ethers/lib/utils");
const axios = require('axios')
const {RateLimiter} = require("limiter");

// Command
// start - submit or update wallet address
// admin - admin portal to send prize

//
//    #####
//   #     #  ####  #    # ###### #  ####
//   #       #    # ##   # #      # #    #
//   #       #    # # #  # #####  # #
//   #       #    # #  # # #      # #  ###
//   #     # #    # #   ## #      # #    #
//    #####   ####  #    # #      #  ####
//

const lmt = new RateLimiter({
  tokensPerInterval: 30,
  interval: 'second',
})

const WHITELIST = [2130493951, 5035670602, 552791389, 1859030053]

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
  const chatId = ctx.update.message.chat.id
  if (chatId < 0) {
    return
  }
  await lmt.removeTokens(1)
  ctx.reply(`BAB Token increase the diversity of incentive and validation methods of the NEST community, thus, we are introducing a daily timely giveaway for BAB Token holders. Total prize of $30,000 NEST tokens. For a period of 4 months.

How to join?
1. Join: https://t.me/NEST_BABGiveaway
2. Join: https://t.me/NESTRedEnvelopesBot
Add your wallet address in the bot.
3. Click: on the giveaway link at the pin of the group.
4. Click: snatch

If you are a newbie, you must complete the first 3 steps. When you're done you just need to click snatch to get the giveaway!


Rewards：
Receive random or fixed NEST token as giveaway rewards or quiz rewards on daily base and will receive exclusive NFTs in the future.

What are BAB tokens?
https://developers.binance.com/docs/babt/introduction
How do I get BAB tokens?
https://www.binance.com/en/support/faq/bacaf9595b52440ea2b023195ba4a09c

More giveaways: Conditions 200 NEST + 1 BAB
https://t.me/NEST_Community/1609`)
  // update user info
  if (ctx.startPayload && Number(ctx.startPayload) !== ctx.update.message.from.id) {
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.update.message.from.id,
      },
      UpdateExpression: 'set invite_code = :invite_code, username = :username',
      ExpressionAttributeValues: {
        ':invite_code': Number(ctx.startPayload),
        ':username': ctx.update.message.from.username || '',
      }
    }))
  } else {
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.update.message.from.id,
      },
      UpdateExpression: 'set username = :username',
      ExpressionAttributeValues: {
        ':username': ctx.update.message.from.username || '',
      }
    }))
  }
  ctx.session = {...ctx.session, intent: undefined}
  if (ctx.session?.wallet) {
    await lmt.removeTokens(1)
    ctx.reply(`Welcome to NEST Prize!

Your wallet: ${ctx.session.wallet}
Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.update.message.from.id}
`, Markup.inlineKeyboard([
      [Markup.button.callback('Update Wallet', 'set-user-wallet')],
      [Markup.button.callback('My Referrals', 'get-user-referrals')],
      [Markup.button.url('🤩 Star Project', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')],
    ]))
    return
  }
  // query user in db
  try {
    const queryUserRes = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.update.message.from.id,
      },
    }))
    if (queryUserRes.Item === undefined || queryUserRes.Item?.wallet === undefined) {
      await lmt.removeTokens(1)
      ctx.reply(`Welcome to NEST Prize!

You have not submitted any addresses to me. Click the button below so you can Snatch our Prize!

Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.update.message.from.id}`, Markup.inlineKeyboard([
        [Markup.button.callback('Submit Wallet', 'set-user-wallet')],
        [Markup.button.callback('My Referrals', 'get-user-referrals')],
        [Markup.button.url('🤩 Star Project', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')],
      ]))
    } else {
      ctx.session = {wallet: queryUserRes.Item.wallet}
      await lmt.removeTokens(1)
      ctx.reply(`Welcome to NEST Prize!

Your wallet: ${queryUserRes.Item.wallet}
Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.update.message.from.id}`, Markup.inlineKeyboard([
        [Markup.button.callback('Update Wallet', 'set-user-wallet')],
        [Markup.button.callback('My Referrals', 'get-user-referrals')],
        [Markup.button.url('🤩 Star Project', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')],
      ]))
    }
  } catch (e) {
    console.log(e)
    ctx.answerCbQuery("Some error occurred, please try again later.")
  }
})

bot.action('get-user-referrals', async (ctx) => {
  try {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: 'nest-prize-users',
      IndexName: 'invite-code-index',
      KeyConditionExpression: 'invite_code = :invite_code',
      ExpressionAttributeValues: {
        ':invite_code': ctx.update.callback_query.from.id,
      }
    }))
    if (result.Count === 0) {
      await ctx.answerCbQuery("You have no referrals yet.")
      return
    }
    await ctx.answerCbQuery()
    await lmt.removeTokens(1)
    ctx.reply(`My Referrals:

${result.Items.map((item) => {
      if (item?.username) {
        return `@${item.username}`
      } else {
        return item.user_id
      }
    }).join(',')
    }`)
  } catch (e) {
    console.log(e)
    ctx.answerCbQuery("Some error occurred, please try again later.")
  }
})

bot.command('admin', async (ctx) => {
  const chat_id = ctx.chat.id;
  if (chat_id < 0) {
    return
  }
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  await replyL1MenuContent(ctx)
})

bot.action('set-user-wallet', async (ctx) => {
  await ctx.answerCbQuery()
  ctx.session = {...ctx.session, intent: 'set-user-wallet'}
  await lmt.removeTokens(1)
  await ctx.editMessageText('Please send your wallet address:')
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
  await lmt.removeTokens(1)
  ctx.reply(`NEST Prize Admin Portal`, Markup.inlineKeyboard([
    [Markup.button.callback('Send', 'set-config')],
    [Markup.button.callback('Liquidate', 'liquidate-info')],
  ]))
}

const editReplyL1MenuContent = async (ctx) => {
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  await ctx.answerCbQuery()
  await lmt.removeTokens(1)
  await ctx.editMessageText('NEST Prize Admin Portal', Markup.inlineKeyboard([
    [Markup.button.callback('Send', 'set-config')],
    [Markup.button.callback('Liquidate', 'liquidate-info')],
  ]))
}

bot.action('backToL1MenuContent', editReplyL1MenuContent)

//
//    #        #####     #                                                       ###
//    #       #     #    #       #  ####  #    # # #####    ##   ##### ######     #  #    # ######  ####
//    #             #    #       # #    # #    # # #    #  #  #    #   #          #  ##   # #      #    #
//    #        #####     #       # #    # #    # # #    # #    #   #   #####      #  # #  # #####  #    #
//    #       #          #       # #  # # #    # # #    # ######   #   #          #  #  # # #      #    #
//    #       #          #       # #   #  #    # # #    # #    #   #   #          #  #   ## #      #    #
//    ####### #######    ####### #  ### #  ####  # #####  #    #   #   ######    ### #    # #       ####
//
const editReplyL2LiquidateInfoContent = async (ctx) => {
  // query number of NEST Prize status is pending
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  try {
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
    let pendingList = []
    for (const item of pendingResult.Items) {
      const record = item?.record || []
      for (const user of record) {
        const index = pendingList.findIndex((i) => i.wallet === user.wallet)
        if (index === -1) {
          if (user.amount > 0) {
            pendingList.push(user)
          }
        } else {
          if (user.amount > 0) {
            pendingList[index].amount += user.amount
          }
        }
      }
    }
    const openAmount = openResult.Items.reduce((acc, cur) => acc + cur.config.amount - cur.balance, 0)
    const pendingAmount = pendingResult.Items.reduce((acc, cur) => acc + cur.config.amount - cur.balance, 0)
    await ctx.answerCbQuery()
    await lmt.removeTokens(1)
    await ctx.editMessageText(`*NEST Prize Liquidate*

Number of open NEST Prize: ${openResult.Count}, had snatched: ${openAmount} NEST.

Number of pending NEST Prize: ${pendingResult.Count}, had snatched: ${pendingAmount} NEST, different users: ${pendingList.length}.

Number of processing NEST Prize: ${processingResult.Count}. Please check out TX and close that.`, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Stop All Snatching Prize', 'pending', openResult.Count === 0)],
        [Markup.button.callback('Liquidate All Snatched Prize', 'liquidate', pendingResult.Count === 0)],
        [Markup.button.callback('Close All Liquidated Prize', 'close', processingResult.Count === 0)],
        [Markup.button.callback('« Back', 'backToL1MenuContent')],
      ])
    })
  } catch (e) {
    console.log(e)
    ctx.answerCbQuery("Some error occurred, please try again later.")
  }
}

bot.action('backToL2LiquidateInfoContent', editReplyL2LiquidateInfoContent)

bot.action('liquidate-info', editReplyL2LiquidateInfoContent)

//
//    #        #####     #
//    #       #     #    #       #  ####  #    # # #####    ##   ##### ######
//    #             #    #       # #    # #    # # #    #  #  #    #   #
//    #        #####     #       # #    # #    # # #    # #    #   #   #####
//    #             #    #       # #  # # #    # # #    # ######   #   #
//    #       #     #    #       # #   #  #    # # #    # #    #   #   #
//    #######  #####     ####### #  ### #  ####  # #####  #    #   #   ######
//
const editReplyL2DoLiquidateContent = async (ctx) => {
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  try {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: 'nest-prize',
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'pending',
      },
    }))
    
    let pendingList = []
    for (const item of result.Items) {
      let walletMap = {}
      let amount = 0
      for (const user of item.record.slice(0, item.config.quantity)) {
        if (walletMap[user.wallet.toLowerCase()]) {
          continue
        }
        walletMap[user.wallet.toLowerCase()] = true
        const index = pendingList.findIndex((i) => i.wallet.toLowerCase() === user.wallet.toLowerCase())
        if (index === -1) {
          if (user.amount > 0 && (amount + user.amount) <= item.config.amount) {
            amount += user.amount
            pendingList.push(user)
          }
        } else {
          if (user.amount > 0 && (amount + user.amount) <= item.config.amount) {
            amount += user.amount
            pendingList[index].amount += user.amount
          }
        }
      }
    }
    
    if (pendingList.length === 0) {
      await ctx.answerCbQuery("No pending NEST Prize found to send.")
      await lmt.removeTokens(1)
      await ctx.editMessageText("No pending NEST Prize found to send.", Markup.inlineKeyboard([
        [Markup.button.callback('« Back', 'backToL2LiquidateInfoContent')],
      ]))
      return
    }
    
    for (const item of result.Items) {
      try {
        await ddbDocClient.send(new UpdateCommand({
          TableName: 'nest-prize',
          Key: {
            chat_id: item.chat_id,
            message_id: item.message_id,
          },
          UpdateExpression: 'SET #s = :s',
          ExpressionAttributeNames: {
            '#s': 'status',
          },
          ExpressionAttributeValues: {
            ':s': 'processing',
          },
        }))
      } catch (e) {
        console.log(e)
        ctx.answerCbQuery("Update NEST Prize status failed, please try again later.")
        await lmt.removeTokens(1)
        ctx.reply("Update NEST Prize status failed, please try again later.")
      }
    }
    
    try {
      let data = 'address,amount\n'
      for (const item of pendingList) {
        data += `${item.wallet},${item.amount}\n`
      }
      await ctx.answerCbQuery()
      await lmt.removeTokens(1)
      await ctx.replyWithDocument({
        source: Buffer.from(data),
        filename: `pending.csv`,
      })
    } catch (e) {
      ctx.reply("Send csv file failed, please try again later.")
    }
  } catch (e) {
    console.log(e)
    ctx.answerCbQuery("Fetch pending NEST Prize failed, please try again later.")
    await lmt.removeTokens(1)
    ctx.reply("Fetch pending NEST Prize failed, please try again later.")
  }
}

bot.action('liquidate', editReplyL2DoLiquidateContent)

// Pending
const editReplyL2PendingContent = async (ctx) => {
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  try {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: 'nest-prize',
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'open',
      },
    }))
    for (const item of result.Items) {
      await ddbDocClient.send(new UpdateCommand({
        TableName: 'nest-prize',
        Key: {
          chat_id: item.chat_id,
          message_id: item.message_id,
        },
        UpdateExpression: 'SET #s = :s',
        ExpressionAttributeNames: {
          '#s': 'status',
        },
        ExpressionAttributeValues: {
          ':s': 'pending',
        },
      }));
    }
    await ctx.answerCbQuery('Stop All Snatching Prize Success!')
    await lmt.removeTokens(1)
    await ctx.editMessageText(`Stop All Snatching Prize Success!`, Markup.inlineKeyboard([
      [Markup.button.callback('Liquidate All Snatched Prize', 'liquidate')],
      [Markup.button.callback('« Back', 'backToL2LiquidateInfoContent')],
    ]))
  } catch (e) {
    console.log(e)
    ctx.answerCbQuery("Some error occurred, please try again later.")
  }
}

bot.action('pending', editReplyL2PendingContent)

//
//    #        #####      #####
//    #       #     #    #     # #       ####   ####  ######
//    #             #    #       #      #    # #      #
//    #        #####     #       #      #    #  ####  #####
//    #             #    #       #      #    #      # #
//    #       #     #    #     # #      #    # #    # #
//    #######  #####      #####  ######  ####   ####  ######
//
const editReplyL3CloseContent = async (ctx) => {
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  try {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: 'nest-prize',
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'processing',
      },
    }))
    for (const item of result.Items) {
      await ddbDocClient.send(new UpdateCommand({
        TableName: 'nest-prize',
        Key: {
          chat_id: item.chat_id,
          message_id: item.message_id,
        },
        UpdateExpression: 'SET #s = :s, #t = :t',
        ExpressionAttributeNames: {
          '#s': 'status',
          '#t': 'ttl',
        },
        ExpressionAttributeValues: {
          ':s': 'close',
          ':t': Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        },
      }));
    }
    await ctx.answerCbQuery('Close All Liquidated Prize Success!')
    await lmt.removeTokens(1)
    await ctx.editMessageText(`Close All Liquidated Prize Success!`, Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'backToL2LiquidateInfoContent')],
    ]))
  } catch (e) {
    console.log(e)
    ctx.answerCbQuery("Some error occurred, please try again later.")
  }
}

bot.action('close', editReplyL3CloseContent)

//
//    #        #####      #####                   #####
//    #       #     #    #     # ###### #####    #     #  ####  #    # ###### #  ####
//    #             #    #       #        #      #       #    # ##   # #      # #    #
//    #        #####      #####  #####    #      #       #    # # #  # #####  # #
//    #       #                # #        #      #       #    # #  # # #      # #  ###
//    #       #          #     # #        #      #     # #    # #   ## #      # #    #
//    ####### #######     #####  ######   #       #####   ####  #    # #      #  ####
//
bot.action('set-config', async (ctx) => {
  ctx.session = {...ctx.session, intent: 'config'}
  await ctx.answerCbQuery()
  await lmt.removeTokens(1)
  await ctx.editMessageText(`Enter NEST Prize config with json format.
  
*parameters:*
token: token symbol
quantity: number of NEST Prize
amount: amount of all NEST Prize
max: max amount of each NEST Prize
min: min amount of each NEST Prize
text: best wishes
chatId: target chatId
cover: cover uri
auth: auth uri

For example: { "token": "NEST", "quantity": 10, "amount": 20, "max": 10, "min": 1, "text": "This is a NEST Prize. @NESTRedEnvelopesBot", "chatId": "@nesttestredenvelopes", "cover": "", "auth": ""}`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'backToL1MenuContent')],
    ])
  })
})

//
//   #        #####      #####
//   #       #     #    #     # ###### #    # #####
//   #             #    #       #      ##   # #    #
//   #        #####      #####  #####  # #  # #    #
//   #             #          # #      #  # # #    #
//   #       #     #    #     # #      #   ## #    #
//   #######  #####      #####  ###### #    # #####
//
bot.action('send', async (ctx) => {
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  const config = ctx.session?.config
  if (config) {
    try {
      // send message to chat_id, record chat_id and message_id to dynamodb
      let res
      if (config.cover !== '') {
        await lmt.removeTokens(1)
        res = await ctx.telegram.sendPhoto(config.chatId, config.cover, {
          caption: `${config.text}

Click snatch button!`,
          parse_mode: 'Markdown',
          protect_content: true,
          ...Markup.inlineKeyboard([
            [Markup.button.callback('Snatch!', 'snatch')],
          ])
        })
      } else {
        await lmt.removeTokens(1)
        res = await ctx.telegram.sendMessage(config.chatId, `${config.text}

Click snatch button!`, {
          parse_mode: 'Markdown',
          protect_content: true,
          ...Markup.inlineKeyboard([
            [Markup.button.callback('Snatch!', 'snatch')],
            [Markup.button.url('Newcomers', 'https://t.me/NESTRedEnvelopesBot'), Markup.button.url('🤩 Star Project', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')]
          ])
        })
      }
      
      const message_id = res.message_id
      const chat_id = res.chat.id
      if (message_id && chat_id) {
        try {
          await ddbDocClient.send(new PutCommand({
            TableName: 'nest-prize',
            Item: {
              chat_id,
              message_id,
              config,
              balance: config.amount, // left balance of NEST Prize
              status: 'open', // open, pending, closed
              creator: ctx.from.id,
              created_at: new Date().getTime(),
              updated_at: new Date().getTime(),
              record: [],
            },
          }))
          await ctx.answerCbQuery('NEST Prize Sent Success!')
          await editReplyL1MenuContent(ctx)
        } catch (e) {
          console.log(e)
          ctx.answerCbQuery("Some error occurred, please try again later.")
        }
      }
    } catch (e) {
      console.log(e)
      ctx.answerCbQuery('Sorry, I cannot send message to target chat.')
    }
  } else {
    ctx.answerCbQuery('Sorry, I cannot understand your config. Please try again.')
  }
})

//
//     #####
//   #     # #    #   ##   #####  ####  #    #
//   #       ##   #  #  #    #   #    # #    #
//    #####  # #  # #    #   #   #      ######
//         # #  # # ######   #   #      #    #
//   #     # #   ## #    #   #   #    # #    #
//    #####  #    # #    #   #    ####  #    #
//
bot.action('snatch', async (ctx) => {
  try {
    const queryUserRes = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize-users',
      ConsistentRead: true,
      Key: {
        user_id: ctx.update.callback_query.from.id,
      },
    }))
    if (queryUserRes.Item === undefined || queryUserRes.Item?.wallet === undefined) {
      await ctx.answerCbQuery('Please Submit Wallet First!')
      return
    }
    const user = queryUserRes.Item
    try {
      const queryPrizeRes = await ddbDocClient.send(new GetCommand({
        TableName: 'nest-prize',
        ConsistentRead: true,
        Key: {
          chat_id: ctx.update.callback_query.message.chat.id,
          message_id: ctx.update.callback_query.message.message_id,
        }
      }))
      if (queryPrizeRes.Item === undefined) {
        ctx.answerCbQuery("The NEST Prize is not found.")
        return
      }
      const prize = queryPrizeRes.Item
      if (prize.record.some(record => record.user_id === ctx.update.callback_query.from.id)) {
        await ctx.answerCbQuery('You have already snatched this NEST Prize!')
        return
      }
      if (prize.record.some(record => record.wallet === user.wallet)) {
        await ctx.answerCbQuery('This wallet have already snatched this NEST Prize!')
        return
      }
      // check if NEST Prize is open
      if (prize.status !== 'open' || prize.balance <= 0) {
        await ctx.answerCbQuery(`Sorry, you are late. All NEST Prize have been given away.
Please pay attention to the group news. Good luck next time.`)
        if (prize.status === 'open') {
          await ddbDocClient.send(new UpdateCommand({
            TableName: 'nest-prize',
            Key: {
              chat_id: ctx.update.callback_query.message.chat.id,
              message_id: ctx.update.callback_query.message.message_id,
            },
            UpdateExpression: 'set #status = :status',
            ExpressionAttributeNames: {'#status': 'status'},
            ExpressionAttributeValues: {
              ':updated_at': new Date().getTime(),
              ':status': 'pending',
            }
          }))
        }
        return
      }
      // check auth api
      if (prize.config.auth) {
        // check user auth
        try {
          const res = await axios(prize.config.auth, {
            method: 'POST',
            data: JSON.stringify({
              "user_id": ctx.update.callback_query.from.id,
              "wallet": user.wallet
            }),
            headers: {
              'Content-Type': 'application/json',
            }
          })
          if (!res.data) {
            await ctx.answerCbQuery(`Sorry, you can't get this NEST Prize. Please read this rule carefully.`)
            return
          }
        } catch (e) {
          await ctx.answerCbQuery(`Sorry, some error occurred. Please try again later.`)
          return
        }
      }
      // can snatch
      let status = "open", amount
      // check if NEST Prize is need empty
      if (prize.record.length === prize.config.quantity - 1) {
        status = 'pending'
        amount = prize.balance
      } else {
        amount = Math.floor(Math.random() * (prize.config.max - prize.config.min) + prize.config.min)
        if (prize.balance <= amount) {
          status = 'pending'
          amount = prize.balance
        }
      }
      // update NEST Prize info in dynamodb
      try {
        await ddbDocClient.send(new UpdateCommand({
          TableName: 'nest-prize',
          Key: {
            chat_id: ctx.update.callback_query.message.chat.id,
            message_id: ctx.update.callback_query.message.message_id,
          },
          UpdateExpression: 'set balance = balance - :amount, updated_at = :updated_at, #record = list_append(#record, :record), #status = :status',
          ExpressionAttributeNames: {'#record': 'record', '#status': 'status'},
          ExpressionAttributeValues: {
            ':amount': amount,
            ':updated_at': new Date().getTime(),
            ':record': [{
              user_id: ctx.update.callback_query.from.id,
              username: ctx.update.callback_query.from.username,
              amount,
              wallet: user.wallet,
            }],
            ':status': status,
          }
        }))
        await ctx.answerCbQuery(`Congratulations, you have got ${amount} NEST.`)
        await lmt.removeTokens(1)
        await ctx.reply(`🎉! ${ctx.update.callback_query.from.username ?? ctx.update.callback_query.from.id} have got ${amount} NEST.`)
      } catch (e) {
        console.log(e)
        ctx.answerCbQuery("Some error occurred, please try again later.")
      }
    } catch (e) {
      console.log(e)
      ctx.answerCbQuery("Some error occurred, please try again later.")
    }
  } catch (e) {
    console.log(e)
    ctx.answerCbQuery("Some error occurred, please try again later.")
  }
})

//
//   #######           #     #
//   #     # #    #    ##   ## ######  ####   ####    ##    ####  ######
//   #     # ##   #    # # # # #      #      #       #  #  #    # #
//   #     # # #  #    #  #  # #####   ####   ####  #    # #      #####
//   #     # #  # #    #     # #           #      # ###### #  ### #
//   #     # #   ##    #     # #      #    # #    # #    # #    # #
//   ####### #    #    #     # ######  ####   ####  #    #  ####  ######
//
bot.on('message', async (ctx) => {
  const chat_id = ctx.message.chat.id
  const input = ctx.message.text
  // group message
  if (chat_id < 0) {
    // do nothing in group
  }
  // DM message
  else {
    const intent = ctx.session?.intent
    if (intent === 'config') {
      try {
        const config = JSON.parse(ctx.message.text)
        if (config.token !== 'NEST') {
          await lmt.removeTokens(1)
          ctx.reply('Token must be NEST. Please try again later.')
          return
        }
        if (config.min > config.max) {
          await lmt.removeTokens(1)
          ctx.reply('Min amount must be less than max amount. Please try again later.')
          return
        }
        if (config.quantity < 1) {
          await lmt.removeTokens(1)
          ctx.reply('Quantity must be greater than 0. Please try again later.')
          return
        }
        await lmt.removeTokens(1)
        await ctx.reply(`Check it again:

token: ${config.token},
quantity: ${config.quantity},
amount: ${config.amount},
max: ${config.max},
min: ${config.min},
text: ${config.text},
chatId: ${config.chatId}
cover: ${config.cover}
auth: ${config.auth}
`, {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('Checked, Send Now!', 'send')],
                [Markup.button.callback('« Back', 'backToL1MenuContent')],
              ])
            }
        )
        ctx.session = {intent: undefined, config: config}
      } catch (e) {
        console.log(e)
        await lmt.removeTokens(1)
        ctx.reply('Sorry, I cannot understand your config. Please try again.')
      }
    } else if (intent === 'set-user-wallet') {
      if (isAddress(input)) {
        try {
          const queryUserRes = await ddbDocClient.send(new GetCommand({
            TableName: 'nest-prize-users',
            ConsistentRead: true,
            Key: {
              user_id: ctx.message.from.id,
            },
          }))
          // If no user info do nothing.
          if (queryUserRes.Item === undefined) {
            try {
              await ddbDocClient.send(new PutCommand({
                TableName: 'nest-prize-users',
                Item: {
                  user_id: ctx.message.from.id,
                  username: ctx.message.from.username,
                  wallet: input,
                  created_at: new Date().getTime(),
                  updated_at: new Date().getTime(),
                },
              }))
              ctx.session = {...ctx.session, intent: undefined, wallet: input}
              await lmt.removeTokens(1)
              ctx.reply(`Your wallet address has submitted. ${input}`, Markup.inlineKeyboard([
                [Markup.button.url('🤩 Star Project', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')],
              ]))
            } catch (e) {
              console.log(e)
              await lmt.removeTokens(1)
              ctx.reply('Some error occurred, please try again later.', {
                reply_to_message_id: ctx.message.message_id,
                ...Markup.inlineKeyboard([
                  [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
                ])
              })
            }
          } else {
            const user = queryUserRes.Item
            if (user?.wallet !== input) {
              try {
                await ddbDocClient.send(new UpdateCommand({
                  TableName: 'nest-prize-users',
                  Key: {
                    user_id: ctx.message.from.id,
                  },
                  UpdateExpression: 'SET wallet = :wallet, updated_at = :updated_at',
                  ExpressionAttributeValues: {
                    ':wallet': input,
                    ':updated_at': new Date().getTime(),
                  }
                }))
                ctx.session = {...ctx.session, intent: undefined, wallet: input}
                await lmt.removeTokens(1)
                ctx.reply(`Your wallet address has updated. ${input}`, Markup.inlineKeyboard([
                  [Markup.button.url('🤩 Star Project', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')],
                ]))
              } catch (e) {
                await lmt.removeTokens(1)
                ctx.reply('Some error occurred, please try again later.', {
                  reply_to_message_id: ctx.message.message_id,
                  ...Markup.inlineKeyboard([
                    [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
                  ])
                })
              }
            } else {
              ctx.session = {...ctx.session, intent: undefined, wallet: input}
              await lmt.removeTokens(1)
              ctx.reply('You entered the same address as you did before.', Markup.inlineKeyboard([
                [Markup.button.url('🤩 Star Project', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')],
              ]))
            }
          }
        } catch (e) {
          console.log(e)
          ctx.answerCbQuery("Some error occurred, please try again later.")
        }
      } else {
        await lmt.removeTokens(1)
        ctx.reply('Please input a valid wallet address.', {
          reply_to_message_id: ctx.message.message_id,
        })
      }
    }
  }
})

//
//    #     #
//    #     #   ##   #    # #####  #      ###### #####
//    #     #  #  #  ##   # #    # #      #      #    #
//    ####### #    # # #  # #    # #      #####  #    #
//    #     # ###### #  # # #    # #      #      #####
//    #     # #    # #   ## #    # #      #      #   #
//    #     # #    # #    # #####  ###### ###### #    #
//
exports.handler = async (event, context, callback) => {
  const tmp = JSON.parse(event.body);
  await bot.handleUpdate(tmp);
  return callback(null, {
    statusCode: 200,
    body: '',
  });
};