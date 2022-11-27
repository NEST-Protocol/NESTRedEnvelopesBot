const {Telegraf, Markup} = require('telegraf')
const {PutCommand, DynamoDBDocumentClient, UpdateCommand, GetCommand, QueryCommand} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {isAddress} = require("ethers/lib/utils");
const axios = require('axios')
const {RateLimiter} = require("limiter");

// Command
// start - show the menu
// admin - admin portal

// limit of send message to different chat
const lmt = new RateLimiter({
  tokensPerInterval: 30,
  interval: 'second',
})

const WHITELIST = [2130493951, 552791389, 1859030053, 5297563752]

const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const token = process.env.BOT_TOKEN
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

const bot = new Telegraf(token)

const botName = "NESTRedEnvelopesBot"

function hashCode(str) {
  let hash = 0, i, chr, len;
  if (str.length === 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

bot.start(async (ctx) => {
  const chatId = ctx.chat.id
  const isBot = ctx.from.is_bot
  if (chatId < 0 || isBot) {
    return
  }
  await lmt.removeTokens(1)
  if (ctx.startPayload && Number(ctx.startPayload) !== ctx.from.id) {
    // Update new username and new invite code, not myself
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.from.id,
      },
      UpdateExpression: 'set invite_code = :invite_code, username = :username',
      ExpressionAttributeValues: {
        ':invite_code': Number(ctx.startPayload) || 0,
        ':username': ctx.from.username || '',
      }
    })).catch(() => {
      console.log('input inviter error')
    })
  } else {
    // update new username, if not exist, create new one
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.from.id,
      },
      UpdateExpression: 'set username = :username',
      ExpressionAttributeValues: {
        ':username': ctx.from.username || '',
      }
    })).catch(() => {
      console.log('update user error')
    })
  }
  // query user in db
  try {
    const queryUserRes = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.from.id,
      },
    }))
    
    await lmt.removeTokens(1)
    ctx.reply(`Welcome to NEST Prize

You wallet: ${queryUserRes?.Item?.wallet || 'Not set yet'},
You twitter: ${queryUserRes?.Item?.twitter_name || 'Not set yet'},

Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.from.id}

Giveaway events, click on NESTFi Events.

/help`, {
      disable_web_page_preview: true,
      ...Markup.inlineKeyboard([
        [Markup.button.callback('My Referrals', 'getUserReferrals'), Markup.button.callback('🤩', 'forDeveloper')],
        [Markup.button.callback('Set Twitter', 'inputUserTwitter'), Markup.button.callback('Set Wallet', 'setUserWallet')],
        [Markup.button.callback('NESTFi Events', 'NESTFiEvents')],
        [Markup.button.url('Star Github', 'https://github.com/NEST-Protocol/NEST-Oracle-V4.0')]
      ])
    })
  } catch (e) {
    await lmt.removeTokens(1)
    await ctx.reply("Some error occurred.", Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'menu')],
    ]))
  }
})

bot.command('help', async (ctx) => {
  const chat_id = ctx.chat.id
  if (chat_id < 0) {
    return
  }
  await lmt.removeTokens(1)
  ctx.reply(`I can help you to get NEST Prizes.

/start - show the menu

You can control me by sending these commands:

*Admin Portal*
/admin - send prizes
  `, {
    parse_mode: 'Markdown',
  })
})

bot.command('admin', async (ctx) => {
  const chat_id = ctx.chat.id;
  if (chat_id < 0 || WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  await lmt.removeTokens(1)
  await ctx.reply(`NEST Prize Admin Portal`, Markup.inlineKeyboard([
    [Markup.button.callback('Send', 'setConfig')],
  ]))
})

bot.action('inputUserTwitter', async (ctx) => {
  const isBot = ctx.update.callback_query.from.is_bot
  if (isBot) {
    return
  }
  await ddbDocClient.send(new UpdateCommand({
    TableName: 'nest-prize-users',
    Key: {
      user_id: ctx.update.callback_query.from.id,
    },
    UpdateExpression: 'set intent = :intent',
    ExpressionAttributeValues: {
      ':intent': 'setUserTwitter',
    }
  }))
  await lmt.removeTokens(1)
  await ctx.reply('Please input your twitter name with @')
})

bot.action('menu', async (ctx) => {
  const isBot = ctx.update.callback_query.from.is_bot
  if (isBot) {
    return
  }
  try {
    const queryUserRes = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.update.callback_query.from.id,
      },
    }))
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
    await ctx.editMessageText(`Welcome to NEST Prize

You wallet: ${queryUserRes?.Item?.wallet || 'Not set yet'},
You twitter: ${queryUserRes?.Item?.twitter_name || 'Not set yet'},

Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.update.callback_query.from.id}

Giveaway events, click on NESTFi Events.

/help`, {
      disable_web_page_preview: true,
      ...Markup.inlineKeyboard([
        [Markup.button.callback('My Referrals', 'getUserReferrals'), Markup.button.callback('🤩', 'forDeveloper')],
        [Markup.button.callback('Set Twitter', 'inputUserTwitter'), Markup.button.callback('Set Wallet', 'setUserWallet')],
        [Markup.button.callback('NESTFi Events', 'NESTFiEvents')],
        [Markup.button.url('Star Github', 'https://github.com/NEST-Protocol/NEST-Oracle-V4.0')]
      ])
    })
  } catch (e) {
    console.log(e)
    await lmt.removeTokens(1)
    await ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('NESTFiEvents', async (ctx) => {
  await lmt.removeTokens(1)
  await ctx.answerCbQuery()
  await ctx.editMessageText(`**Event Introduction**
  
🍔 Hamburger (New user First Order Bonus)
Bonus: 50 NEST+Snatch 10 NEST every day

🍕 Pizza (Invitation Bonus)
Bonus: 20 NEST

🐣 Butter chicken (Volume Bonus)
Requirements: 1. For every 500 futures NEST volume accumulated, you can earn a fixed bonus 2. Order length must be greater than 5 minutes, leverage can choose 5x, 10x, 20x
Rewards: 5x leverage rewards 20 NEST, 10x leverage rewards 30 NEST, 20x leverage rewards 50 NEST.

🍺 Beer (Whitelist Reward)
Bonus: 3% of the total trading volume as a bonus pool.

With NEST black NFT all rewards X1.3, yellow NFT all rewards X1.15, red NFT all rewards X1.1
https://finance.nestprotocol.org/#/NFTAuction
Details：https://medium.com/@nest-protocol/new-nest-finance-event-food-festival-41933fda937c`, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
   ...Markup.inlineKeyboard([
     [Markup.button.url('🍔 Hamburger', 'https://t.me/nestficommunity/21121'), Markup.button.callback('🍕 Pizza', 'pizza')],
     [Markup.button.callback('🐣 Butter chicken', 'butterChicken'), Markup.button.callback('🍺 Beer', 'beer')],
     [Markup.button.webApp('Rank', 'https://nest-prize-webapp.on.fleek.co/rank/abcd.html'), Markup.button.callback('Settlement', 'settlement')],
     [Markup.button.callback('« Back', 'menu')]
   ])
  })
})

bot.action('pizza', async (ctx) => {
  try {
    const res = await axios({
      method: 'get',
      url: `https://work.parasset.top/workbench-api/activity/user/invite/detail?chatId=${ctx.update.callback_query.from.id}`,
      headers: {
        'Authorization': `Bearer ${process.env.NEST_API_TOKEN}`,
      }
    })
    if (res.data.code === 0) {
      await lmt.removeTokens(1)
      await ctx.answerCbQuery()
      await ctx.editMessageText(`Invitees conditions
  
1. 200 NEST accumulated on open futures positions
2. Leverage greater than 5X
3. Position opening time greater than 5 minutes

Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.update.callback_query.from.id}

Complete pizza:
${res.data.data?.detail?.map((item) => (`@${item.username} ${item.state ? '✅' : '❌'}`)).join('/n')}
`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back', 'NESTFiEvents')]
        ])
      })
    } else {
      await ctx.answerCbQuery('Some error occurred.')
    }
  } catch (e) {
    await ctx.answerCbQuery('Some error occurred.')
  }
})

bot.action('butterChicken', async (ctx) => {
  try {
    const res = await axios({
      method: 'get',
      url: `https://work.parasset.top/workbench-api/activity/tickets?chatId=${ctx.update.callback_query.from.id}`,
      headers: {
        'Authorization': `Bearer ${process.env.NEST_API_TOKEN}`,
      }
    })
    if (res.data.code === 0) {
      const tickets = res.data.data?.tickets || 0
      const history = res.data.data?.history || []
      
      await lmt.removeTokens(1)
      await ctx.answerCbQuery()
      await ctx.editMessageText(`Conditions

1. 500 NEST accumulated on open futures positions
2. Leverage greater than 5X
3. Position opening time greater than 5 minutes

One lottery for each completion, no limit

Reward: Minimum 30 NEST per draw, maximum 100 NEST.
Butter chicken updated every minute

Complete Butter chicken: ${tickets}
${history.map((item) => item).join(',')}
`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`Draw (${tickets})`, 'butterChickenDraw', tickets <= 0)],
          [Markup.button.callback('« Back', 'NESTFiEvents')]
        ])
      })
    } else {
      ctx.answerCbQuery('Some error occurred.')
    }
  } catch (e) {
    ctx.answerCbQuery('Some error occurred.')
  }
})

bot.action('butterChickenDraw', async (ctx) => {
  try {
    const res = await axios({
      method: 'post',
      url: `https://work.parasset.top/workbench-api/activity/tickets?chatId=${ctx.update.callback_query.from.id}`,
      headers: {
        'Authorization': `Bearer ${process.env.NEST_API_TOKEN}`,
      }
    })
    if (res.data.code === 0) {
      const tickets = res.data.data?.tickets || 0
      const history = res.data.data?.history || []
      
      await lmt.removeTokens(1)
      await ctx.answerCbQuery()
      await ctx.editMessageText(`Conditions

1. 1000 NEST accumulated on open futures positions
2. Leverage greater than 5X
3. Position opening time greater than 5 minutes

One lottery for each completion, no limit

Reward: Minimum 30 NEST per draw, maximum 100 NEST.
Butter chicken updated every minute

Complete Butter chicken: ${tickets}
${history.map((item) => item).join(',')}
`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`Draw (${tickets})`, 'butterChickenDraw', tickets === 0)],
          [Markup.button.callback('« Back', 'NESTFiEvents')]
        ])
      })
    } else {
      ctx.answerCbQuery('Some error occurred.')
    }
  } catch (e) {
    ctx.answerCbQuery('Some error occurred.')
  }
})

bot.action('beer', async (ctx) => {
  try {
    const res = await axios({
      method: 'get',
      url: `https://work.parasset.top/workbench-api/activity/user/whitelist/state?chatId=${ctx.update.callback_query.from.id}`,
      headers: {
        'Authorization': `Bearer ${process.env.NEST_API_TOKEN}`,
      }
    })
    
    if (res.data.code === 0) {
      await lmt.removeTokens(1)
      await ctx.answerCbQuery()
      await ctx.editMessageText(`Complete Beer:
Make a total personal transaction of more than 10,000 NEST. ${res.data.data?.txState ? '✅' : '❌'}

Reward:
3% of the total monthly trading volume is awarded to the whitelist owners. Of this 3% bonus, 10% goes to the whitelist owners and 90% of the bonus is awarded according to the ranking system.
`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back', 'NESTFiEvents')]
        ])
      })
    } else {
      await ctx.answerCbQuery('Some error occurred.')
    }
  } catch (e) {
    ctx.answerCbQuery('Some error occurred.')
  }
})

bot.action('forDeveloper', async (ctx) => {
  const isBot = ctx.update.callback_query.from.is_bot
  if (isBot) {
    return
  }
  await lmt.removeTokens(1)
  await ctx.answerCbQuery()
  await ctx.editMessageText(`*Another Revolution in Blockchain*

*NEST PVM*
NEST Probability Virtual Machine (PVM) is a virtual machine-like structure based on the basic function library. Developers can develop various exciting applications based on the function library, similar to Ethereum virtual machine (EVM) programming.
Github repository: [NEST-PVM-V1.0](https://github.com/NEST-Protocol/NEST-PVM-V1.0). More [PVM Mechanism](https://nestprotocol.org/docs/Concept/PVM/)

*NEST Oracle*
NEST oracle is the only truly decentralized oracle on the market today.
Github repository: [NEST-Oracle-V4.0](https://github.com/NEST-Protocol/NEST-Oracle-V4.0). [How to Mining](https://nestprotocol.org/docs/Technical-Reference-NEST-Oracle/#how-to-mining/), [How to Call Price](https://nestprotocol.org/docs/Technical-Reference-NEST-Oracle/#how-to-call-price)
`, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    ...Markup.inlineKeyboard([
      [Markup.button.url('Follow Github', 'https://github.com/NEST-Protocol'), Markup.button.url('Developer Doc', 'https://nestprotocol.org/docs/PVM-Technical-Reference/')],
      [Markup.button.url('New Issues', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues/new'), Markup.button.callback('« Back', 'menu')],
      [Markup.button.url('Star Github', 'https://github.com/NEST-Protocol/NEST-Oracle-V4.0')]
    ])
  })
})

bot.action('getUserReferrals', async (ctx) => {
  const isBot = ctx.update.callback_query.from.is_bot
  if (isBot) {
    return
  }
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
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
    await ctx.editMessageText(`My Referrals:

${result.Items.map((item) => {
      if (item?.username) {
        return `@${item.username}`
      } else {
        return item.user_id
      }
    }).join(',')
    }`, Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'menu')],
    ]))
  } catch (e) {
    console.log(e)
    await lmt.removeTokens(1)
    await ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('setUserWallet', async (ctx) => {
  const isBot = ctx.update.callback_query.from.is_bot
  if (isBot) {
    return
  }
  try {
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.update.callback_query.from.id,
      },
      UpdateExpression: 'set intent = :intent',
      ExpressionAttributeValues: {
        ':intent': 'setUserWallet',
      }
    }))
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
    await ctx.editMessageText('Please send your wallet address:')
  } catch (e) {
    console.log(e)
    await lmt.removeTokens(1)
    await ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('checkTwitter', async (ctx) => {
  try {
    const res = await axios({
      method: 'GET',
      timeout: 3000,
      url: `https://work.parasset.top/workbench-api/twitter/userInfo?cond=${ctx.update.callback_query.from.id}`,
      headers: {
        'Authorization': `Bearer ${process.env.NEST_API_TOKEN}`,
      }
    })
    if (res.data?.data.length === 0) {
      ctx.editMessageText("You haven't authorized yet, please click the 'Authorize' button to authorize.", Markup.inlineKeyboard([
        [Markup.button.url('Authorize', `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=dU9nMk54dnQzc0UtNjNwbDRrWno6MTpjaQ&redirect_uri=https://nestdapp.io/twitter&scope=tweet.read%20users.read%20follows.read%20like.read%20offline.access&state=${hashCode(botName)}_${ctx.update.callback_query.from.id}&code_challenge=challenge&code_challenge_method=plain`)],
        [Markup.button.callback('I have Authorized', 'checkTwitter')],
      ]))
    } else {
      const access_token = res.data.data[0].access_token
      const twitter_name = res.data.data[0].twitter_name.replace('@', '')
      const twitter_id = res.data.data[0].twitter_id
      await ddbDocClient.send(new UpdateCommand({
        TableName: 'nest-prize-users',
        Key: {
          user_id: ctx.update.callback_query.from.id,
        },
        UpdateExpression: 'set twitter_name = :twitter_name, twitter_id = :twitter_id, twitter_token = :twitter_token',
        ExpressionAttributeValues: {
          ':twitter_name': twitter_name,
          ':twitter_id': twitter_id,
          ':twitter_token': access_token,
        }
      }))
      ctx.editMessageText("You have authorized successfully.", Markup.inlineKeyboard([
        [Markup.button.callback('« Back', 'menu')],
      ]))
    }
  } catch (e) {
    ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('settlement', async (ctx) => {
  try {
    const res = await axios({
      method: 'get',
      url: `https://work.parasset.top/workbench-api/activity/user/settle/detail?chatId=${ctx.update.callback_query.from.id}`,
      headers: {
        'Authorization': `Bearer ${process.env.NEST_API_TOKEN}`,
      }
    })
    if (res.data.code === 0) {
      await lmt.removeTokens(1)
      ctx.answerCbQuery()
      ctx.editMessageText(`Month’s reward pool: ${Number(res.data.data.pool).toLocaleString()} NEST
My this month point: ${res.data.data.credit.total}
1. My transaction amount ${res.data.data?.myTx || '0'} NEST: +${res.data.data.credit.detail.myTx}
2. invitee ${res.data.data.invite.validCount} completes a cumulative transaction volume of 10,000 NEST. +${res.data.data.credit.detail.inviteValid}

90% point reward：${res.data.data.balance.total} NEST
10% whitelist reward：${res.data.data.balance.detail.whitelist} NEST

500NEST futures 5x N times reward : (TBD) NEST
500NEST futures 10x N times reward: (TBD) NEST
500NEST futures 20x N times reward: (TBD) NEST
`, Markup.inlineKeyboard([
        [Markup.button.callback('« Back', 'NESTFiEvents')],
      ]))
    } else {
      await ctx.answerCbQuery("Some error occurred.")
    }
  } catch (e) {
    console.log(e)
    await ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('admin', async (ctx) => {
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  await lmt.removeTokens(1)
  await ctx.answerCbQuery()
  await ctx.editMessageText('NEST Prize Admin Portal', Markup.inlineKeyboard([
    [Markup.button.callback('Send', 'setConfig')],
  ]))
})

bot.action('setConfig', async (ctx) => {
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  try {
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.update.callback_query.from.id,
      },
      UpdateExpression: 'set intent = :intent',
      ExpressionAttributeValues: {
        ':intent': 'setConfig',
      }
    }))
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
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

For example: {"token": "NEST", "quantity": 10, "amount": 20, "max": 10, "min": 1, "text": "This is a NEST Prize. @NESTRedEnvelopesBot", "chatId": "@nesttestredenvelopes", "cover": "", "auth": ""}`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('« Back', 'admin')],
      ])
    })
  } catch (e) {
    await lmt.removeTokens(1)
    await ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('send', async (ctx) => {
  const chat_id = ctx.update.callback_query.from.id
  if (WHITELIST.findIndex((id) => id === chat_id) === -1) {
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
    await ctx.reply(`Sorry, ${chat_id} are not allowed to use this command!`, Markup.inlineKeyboard([
      [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
    ]))
    return
  }
  try {
    const queryUserRes = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: chat_id,
      },
    }))
    if (queryUserRes.Item?.intent === 'setConfig' && queryUserRes.Item?.config) {
      try {
        // send message to chat_id, record chat_id and message_id to dynamodb
        let res
        const config = queryUserRes.Item?.config
        if (config.cover !== '') {
          await lmt.removeTokens(1)
          res = await ctx.telegram.sendPhoto(config.chatId, config.cover, {
            caption: config.text,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('Snatch!', 'snatch')],
            ])
          })
        } else {
          await lmt.removeTokens(1)
          await ctx.answerCbQuery()
          res = await ctx.telegram.sendMessage(config.chatId, config.text, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('Snatch!', 'snatch')],
              [Markup.button.url('Newcomers', 'https://t.me/NESTRedEnvelopesBot'), Markup.button.url('🤩 Star', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')],
              [Markup.button.url(`Get 50 NEST`, 'https://t.me/nestficommunity/21121')]
            ])
          })
        }
        
        const message_id = res?.message_id || undefined
        const chat_id = res?.chat.id || undefined
        if (message_id && chat_id) {
          try {
            await ddbDocClient.send(new PutCommand({
              TableName: 'nest-prize',
              Item: {
                chat_id,
                message_id,
                config,
                balance: config.amount, // left balance of NEST Prize
                status: 'open', // open, pending, processing
                creator: ctx.from.id,
                record: [],
              },
            }))
            await ctx.answerCbQuery()
            await ctx.editMessageText('NEST Prize Sent Success!', Markup.inlineKeyboard([
              [Markup.button.callback('« Back', 'admin')],
            ]))
          } catch (e) {
            console.log(e)
            await ctx.answerCbQuery("Some error occurred.")
          }
        }
      } catch (e) {
        console.log(e)
        await ctx.answerCbQuery("Sorry, I cannot send message to target chat.")
      }
    } else {
      ctx.answerCbQuery('Sorry, I cannot understand your config. Please try again.')
    }
  } catch (e) {
    console.log(e)
    await lmt.removeTokens(1)
    await ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('snatch', async (ctx) => {
  const isBot = ctx.update.callback_query.from.is_bot
  if (isBot) {
    return
  }
  try {
    const queryUserRes = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize-users',
      ConsistentRead: true,
      Key: {
        user_id: ctx.update.callback_query.from.id,
      },
    }))
    const user = queryUserRes?.Item || undefined
    if (user === undefined || user?.wallet === undefined) {
      await ctx.answerCbQuery('Please Update Wallet First!')
      return
    }
    if (user?.blocked) {
      await ctx.answerCbQuery('Sorry, you are blocked.')
      return
    }
    if (user?.twitter_name === undefined) {
      await ctx.answerCbQuery('Please input Twitter First!')
      return
    }
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
        ctx.answerCbQuery("The NEST Prize has not found.")
        return
      }
      const prize = queryPrizeRes.Item
      if (prize.record.some(record => record.user_id === ctx.update.callback_query.from.id)) {
        await ctx.answerCbQuery('You have already snatched this Prize!')
        return
      }
      if (prize.record.some(record => record.wallet === user.wallet)) {
        await ctx.answerCbQuery('This wallet have already snatched this Prize!')
        return
      }
      // check if NEST Prize is open
      if (prize.status !== 'open' || prize.balance <= 0) {
        await ctx.answerCbQuery(`Sorry, you are late.`)
        if (prize.status === 'open') {
          ddbDocClient.send(new UpdateCommand({
            TableName: 'nest-prize',
            Key: {
              chat_id: ctx.update.callback_query.message.chat.id,
              message_id: ctx.update.callback_query.message.message_id,
            },
            UpdateExpression: 'set #status = :status',
            ExpressionAttributeNames: {'#status': 'status'},
            ExpressionAttributeValues: {
              ':status': 'pending',
            }
          })).catch(e => console.log(e))
        }
        return
      }
      if (prize.config.auth) {
        try {
          const res = await axios(prize.config.auth, {
            method: 'POST',
            data: JSON.stringify({
              "user_id": ctx.update.callback_query.from.id,
              "wallet": user?.wallet || null,
              "twitter": user?.twitter_name || null,
            }),
            headers: {
              'Content-Type': 'application/json',
            }
          })
          if (!res.data) {
            await ctx.answerCbQuery(`Sorry, you can't. Please read this rule carefully.`)
            return
          }
        } catch (e) {
          await ctx.answerCbQuery(`Sorry, please try again later.`)
          return
        }
      }
      // can snatch
      let status = "open", amount
      // check if NEST Prize is need empty
      if (prize.record.length === prize.config.quantity - 1) {
        status = 'pending'
        amount = Math.floor(Math.random() * (prize.config.max - prize.config.min) + prize.config.min)
        if (prize.balance <= amount) {
          amount = prize.balance
        }
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
          UpdateExpression: 'set balance = balance - :amount, #record = list_append(#record, :record), #status = :status',
          ConditionExpression: 'balance >= :amount',
          ExpressionAttributeNames: {'#record': 'record', '#status': 'status'},
          ExpressionAttributeValues: {
            ':amount': amount,
            ':record': [{
              user_id: ctx.update.callback_query.from.id,
              username: ctx.update.callback_query.from.username,
              amount,
              wallet: user.wallet,
            }],
            ':status': status,
          },
        }))
        await lmt.removeTokens(1)
        await ctx.answerCbQuery(`You have got ${amount} NEST!`)
        if (prize.record.length === 0) {
          await ctx.reply(`🐑 *Here is the Leader Sheep*

@${ctx.update.callback_query.from.username} have got ${amount} NEST!
`,
              {
                ...Markup.inlineKeyboard([
                  [Markup.button.url('Full List', `https://y2qpo4q6i7wbwa4jio7mgvuhc40feltc.lambda-url.ap-northeast-1.on.aws/?chat_id=${ctx.update.callback_query.message.chat.id}&message_id=${ctx.update.callback_query.message.message_id}`), Markup.button.url('Get 50 NEST', 'https://t.me/nestficommunity/21121')],
                  [Markup.button.url('Win everything with NEST', 'https://wineverything.on.fleek.co/')]
                ]),
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_to_message_id: ctx.update.callback_query.message.message_id,
              })
        }
        
        if ((prize.record.length + 1) % 10 === 0 || prize.record.length === prize.config.quantity - 1) {
          await ctx.reply(`🎉🎉🎉 *The latest 10 snatchers are*:

${prize.record.slice(-9).map((record) => `@${record.username} have got ${record.amount} NEST!`).join('\n')}
@${ctx.update.callback_query.from.username} have got ${amount} NEST!
`, {
            ...Markup.inlineKeyboard([
              [Markup.button.url('Full List', `https://y2qpo4q6i7wbwa4jio7mgvuhc40feltc.lambda-url.ap-northeast-1.on.aws/?chat_id=${ctx.update.callback_query.message.chat.id}&message_id=${ctx.update.callback_query.message.message_id}`), Markup.button.url('Get 50 NEST', 'https://t.me/nestficommunity/21121')],
              [Markup.button.url('Win everything with NEST', 'https://wineverything.on.fleek.co/')]
            ]),
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_to_message_id: ctx.update.callback_query.message.message_id,
          })
        }
        ctx.telegram.sendMessage(ctx.update.callback_query.from.id, `🎉 *You has snatched ${amount} NEST*

From: ${ctx.update.callback_query.message.chat.title} @${ctx.update.callback_query.message.chat.username}`, {
          parse_mode: "Markdown",
        }).catch((e) => console.log(e))
      } catch (e) {
        console.log(e)
        ctx.answerCbQuery("Some error occurred.")
      }
    } catch (e) {
      console.log(e)
      ctx.answerCbQuery("Some error occurred.")
    }
  } catch (e) {
    console.log(e)
    ctx.answerCbQuery("Some error occurred.")
  }
})

bot.on('message', async (ctx) => {
  const input = ctx.message.text
  const chat_id = ctx.message.chat.id
  const isBot = ctx.message.from.is_bot
  if (chat_id < 0 || isBot) {
    return
  }
  try {
    const queryUserRes = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.message.from.id,
      }
    }))
    const intent = queryUserRes.Item?.intent || undefined
    if (queryUserRes.Item?.blocked) {
      await ctx.reply("Sorry, you are blocked.")
      return
    }
    
    if (intent === undefined) {
    } else if (intent === 'setConfig') {
      try {
        const config = JSON.parse(input)
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
chatId: ${config.chatId},
cover: ${config.cover},
auth: ${config.auth}
`, {
              disable_web_page_preview: true,
              ...Markup.inlineKeyboard([
                [Markup.button.callback('Checked, Send Now!', 'send')],
                [Markup.button.callback('« Back', 'admin')],
              ])
            }
        )
        await ddbDocClient.send(new UpdateCommand({
          TableName: 'nest-prize-users',
          Key: {
            user_id: ctx.message.from.id,
          },
          UpdateExpression: 'set #c = :c',
          ExpressionAttributeNames: {'#c': 'config'},
          ExpressionAttributeValues: {
            ':c': config,
          }
        }))
      } catch (e) {
        console.log(e)
        await lmt.removeTokens(1)
        ctx.reply('Sorry, I cannot understand your config.')
      }
    } else if (intent === 'setUserWallet') {
      if (isAddress(input)) {
        try {
          await ddbDocClient.send(new UpdateCommand({
            TableName: 'nest-prize-users',
            Key: {
              user_id: ctx.message.from.id,
            },
            UpdateExpression: 'SET wallet = :wallet',
            ExpressionAttributeValues: {
              ':wallet': input,
            }
          }))
          await lmt.removeTokens(1)
          ctx.reply(`Your wallet address has updated: ${input}`, Markup.inlineKeyboard([
            [Markup.button.callback('« Back', 'menu')],
            [Markup.button.callback('🤩', 'forDeveloper')],
          ]))
        } catch (e) {
          await lmt.removeTokens(1)
          ctx.reply('Some error occurred.', {
            reply_to_message_id: ctx.message.message_id,
            ...Markup.inlineKeyboard([
              [Markup.button.callback('« Back', 'menu')],
              [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
            ])
          })
        }
      } else {
        await lmt.removeTokens(1)
        ctx.reply('Please input a valid wallet address.', {
          reply_to_message_id: ctx.message.message_id,
        })
      }
    } else if (intent === 'setUserTwitter') {
      if (input.startsWith('@')) {
        try {
          await ddbDocClient.send(new UpdateCommand({
            TableName: 'nest-prize-users',
            Key: {
              user_id: ctx.message.from.id,
            },
            UpdateExpression: 'SET twitter_name = :tn',
            ExpressionAttributeValues: {
              ':tn': input.slice(1),
            }
          }))
          await lmt.removeTokens(1)
          ctx.reply(`Your twitter has updated: ${input}`, Markup.inlineKeyboard([
            [Markup.button.callback('« Back', 'menu')],
            [Markup.button.callback('🤩', 'forDeveloper')],
          ]))
        } catch (e) {
          await lmt.removeTokens(1)
          ctx.reply('Some error occurred.', {
            reply_to_message_id: ctx.message.message_id,
            ...Markup.inlineKeyboard([
              [Markup.button.callback('« Back', 'menu')],
              [Markup.button.url('New Issue', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues')]
            ])
          })
        }
      } else {
        ctx.reply('Please input a valid twitter account start with @.')
      }
    }
  } catch (e) {
    await lmt.removeTokens(1)
    ctx.reply('Some error occurred.')
  }
})

exports.handler = async (event, context, callback) => {
  const tmp = JSON.parse(event.body);
  await bot.handleUpdate(tmp);
  return callback(null, {
    statusCode: 200,
    body: '',
  });
};