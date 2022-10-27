const {Telegraf, Markup} = require('telegraf')
const {PutCommand, DynamoDBDocumentClient, UpdateCommand, GetCommand, QueryCommand} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {isAddress} = require("ethers/lib/utils");
const axios = require('axios')
const {RateLimiter} = require("limiter");

// Command
// start - show the menu
// admin - admin portal
// setwallet - change your wallet address
// settwitter - change your twitter address

// limit of send message to different chat
const lmt = new RateLimiter({
  tokensPerInterval: 30,
  interval: 'second',
})

const WHITELIST = [2130493951, 552791389, 1859030053]

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
  ctx.reply(`BAB Token increase the diversity of incentive and validation methods of the NEST community, thus, we are introducing a daily timely giveaway for BAB Token holders. Total prize of $30,000 NEST tokens. For a period of 4 months.

How to join?
1. Join: https://t.me/NEST_BABGiveaway
2. Join: https://t.me/NESTRedEnvelopesBot
Add your BNB BEP20 address and authorize your Twitter account
3. Click: on the giveaway link at the pin of the group.
4. Click: snatch

If you are a newbie, you must complete the first 3 steps. When you're done you just need to click snatch to get the giveaway!


Rewards：
Receive random or fixed NEST token as giveaway rewards or quiz rewards on daily base and will receive exclusive NFTs in the future.

Distribution time: All rewards are distributed every 7 days

What are BAB tokens?
https://developers.binance.com/docs/babt/introduction
How do I get BAB tokens?
https://www.binance.com/en/support/faq/bacaf9595b52440ea2b023195ba4a09c

More giveaways: Conditions 400 NEST + 1 BAB
https://t.me/NEST_Community/1609

BNB Twitter link: https://twitter.com/BNBCHAIN/status/1573885005016743938`)
  if (ctx.startPayload && Number(ctx.startPayload) !== ctx.from.id) {
    // Update new username and new invite code, not myself
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.from.id,
      },
      UpdateExpression: 'set invite_code = :invite_code, username = :username',
      ExpressionAttributeValues: {
        ':invite_code': Number(ctx.startPayload),
        ':username': ctx.from.username || '',
      }
    }))
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
    }))
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

You wallet: ${queryUserRes?.Item?.wallet || 'Not set yet'}, /setwallet
You twitter: ${queryUserRes?.Item?.twitter_name || 'Not set yet'}, /settwitter

Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.from.id}

Welcome to click the 🤩 button below to join our developer community. /help.`, Markup.inlineKeyboard([
      [Markup.button.callback('My Referrals', 'getUserReferrals'), Markup.button.callback('🤩', 'forDeveloper')],
      [Markup.button.callback('NESTFi Events', 'NESTFiEvents')],
    ]))
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

*Edit Info*
/setwallet - change your wallet address
/settwitter - change your twitter account

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
    [Markup.button.callback('Liquidate', 'liquidateInfo')],
  ]))
})

bot.command('setwallet', async (ctx) => {
  const chat_id = ctx.chat.id
  if (chat_id < 0) {
    return
  }
  await lmt.removeTokens(1)
  try {
    await ctx.reply(`Please click the 'To Verify' button to complete the CAPTCHA, then click '» Next' to continue.`, Markup.inlineKeyboard([
      [Markup.button.url('To Verify', `https://ep6wilhzkgmikzeyhbqbsidorm0biins.lambda-url.ap-northeast-1.on.aws/?user_id=${ctx.from.id}`)],
      [Markup.button.callback('» Next', 'setUserWallet')],
    ]))
  } catch (e) {
    await ctx.reply('Verify First!')
  }
})

bot.command('settwitter', async (ctx) => {
  const chat_id = ctx.chat.id
  if (chat_id < 0) {
    return
  }
  await lmt.removeTokens(1)
  try {
    await ctx.reply(`Please follow our twitter and click the 'Verify' button to complete the CAPTCHA, then click '» Next' to continue.`, Markup.inlineKeyboard([
      [Markup.button.url('🐦 Follow', 'https://twitter.com/NEST_Protocol'), Markup.button.url('🤖️ Verify', `https://ep6wilhzkgmikzeyhbqbsidorm0biins.lambda-url.ap-northeast-1.on.aws/?user_id=${ctx.from.id}`)],
      [Markup.button.callback('» Next', 'setUserTwitter')],
    ]))
  } catch (e) {
    await ctx.reply('Verify First!')
  }
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

You wallet: ${queryUserRes?.Item?.wallet || 'Not set yet'}, /setwallet
You twitter: ${queryUserRes?.Item?.twitter_name || 'Not set yet'}, /settwitter

Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.update.callback_query.from.id}

Welcome to click the 🤩 button below to join our developer community. /help.`, Markup.inlineKeyboard([
      [Markup.button.callback('My Referrals', 'getUserReferrals'), Markup.button.callback('🤩', 'forDeveloper')],
      [Markup.button.callback('NESTFi Events', 'NESTFiEvents')],
    ]))
  } catch (e) {
    console.log(e)
    await lmt.removeTokens(1)
    await ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('NESTFiEvents', async (ctx) => {
  await lmt.removeTokens(1)
  await ctx.answerCbQuery()
  await ctx.editMessageText(`To celebrate the NEST Fi product upgrade, NEST DAO is offering over 5 million NEST tokens to cook 3 delicious meals and beers for everyone. The new upgrade is based entirely on suggestions from the community and we have increased the leverage multiplier to 20x and added candlesticks. The advantages we have always had are: no holding costs and using oracle to access price information.

Hamburger (First Order Bonus)

Conditions (70 NEST per person)
1. 1000 NEST accumulated on open futures positions
2. Leverage greater than 5X
3. Position opening time greater than 5 minutes
*No need to close an order to receive

Collection method: https://t.me/NEST_BABGiveaway/141868
Futures website: https://finance.nestprotocol.org
Product communication group: https://t.me/nestficommunity

Pizza (Invitation Bonus)
1. 20 NEST for each person you invite to complete 1000 NEST futures trades. (Bonus pool: 1,000,000 NEST)
2. For each person you invite, you will receive a bonus of 1% of the amount of each open position. (Bonus Pool: 200,000 NEST)

Butter chicken (Volume Bonus)
Requirements: 1. You will receive one draw per trade volume of 1000 NEST. 2. The order must be greater than 5 minutes in duration and must be 5 times leveraged
Reward: Minimum 30 NEST per draw, maximum 100 NEST.

Beer (Whitelist Reward)
Rules: Invite 10 people to complete the Hamburger mission and make a total personal transaction of more than 50,000 NEST to the whitelist. You will receive a monthly fixed percentage bonus and ranking bonus

Reward:
3% of the total monthly trading volume is awarded to the whitelist owners. Of this 3% bonus, 10% goes to the whitelist owners and 90% of the bonus is awarded according to the ranking system.

For example, if 2,000 people all complete 50,000 NEST of futures volume, then the total volume for that month is 100 million. 3% is used as a bonus, so that is a bonus pool of 3 million. 90% of this 3 million is distributed based on ranking and 10% is distributed equally to everyone.

The ranking is based on the sum of the following additional points

+5 points for invitations greater than 10 people, +2 points for invitees’ transactions greater than 100,000 NEST, +2 points for individual transactions greater than 50,000 NEST

Total trading volume refers to the total trading volume of all those who participated in the event
Trading volume only counts open NEST, not close NEST
All delicious meals are done in our kitchen robot!

https://t.me/NESTRedEnvelopesBot`, Markup.inlineKeyboard([
    [Markup.button.url('🍔 Hamburger', 'https://t.me/NEST_BABGiveaway/141868'), Markup.button.callback('🍕 Pizza', 'pizza')],
    [Markup.button.callback('🐣 Butter chicken', 'butterChicken'), Markup.button.callback('🍺 Beer', 'beer')],
    [Markup.button.callback('« Back', 'menu')]
  ]))
})

bot.action('pizza', async (ctx) => {
  await lmt.removeTokens(1)
  await ctx.answerCbQuery()
  await ctx.editMessageText(`Invitees conditions
  
1. 1000 NEST accumulated on open futures positions
2. Leverage greater than 5X
3. Position opening time greater than 5 minutes

Your ref link: https://t.me/NESTRedEnvelopesBot?start=${ctx.update.callback_query.from.id}

Complete pizza:
(TBD)
`, Markup.inlineKeyboard([
    [Markup.button.callback('« Back', 'NESTFiEvents')]
  ]))
})

bot.action('butterChicken', async (ctx) => {
  await lmt.removeTokens(1)
  await ctx.answerCbQuery()
  await ctx.editMessageText(`Conditions

1. 1000 NEST accumulated on open futures positions
2. Leverage greater than 5X
3. Position opening time greater than 5 minutes

One lottery for each completion, no limit

Reward: Minimum 30 NEST per draw, maximum 100 NEST.

Complete Butter chicken:
(TBD)
`, Markup.inlineKeyboard([
    [Markup.button.callback('Draw', 'butterChickenDraw')],
    [Markup.button.callback('« Back', 'NESTFiEvents')]
  ]))
})

bot.action('butterChickenDraw', async (ctx) => {
  await lmt.removeTokens(1)
  await ctx.answerCbQuery("TBD")
})

bot.action('beer', async (ctx) => {
  await lmt.removeTokens(1)
  await ctx.answerCbQuery()
  await ctx.editMessageText(`Conditions

1. Invite 10 people to complete the Hamburger mission and make a total personal transaction of more than 50,000 NEST to the whitelist.
2. You will receive a monthly fixed percentage bonus and ranking bonus

Reward:
5% of the total monthly trading volume is awarded to the whitelist owners. Of this 5% bonus, 10% goes to the whitelist owners and 90% of the bonus is awarded according to the ranking system.

Complete Beer:
Invite 10 people to complete the Hamburger mission. (TBD)
make a total personal transaction of more than 50,000 NEST. (TBD)
`, Markup.inlineKeyboard([
    [Markup.button.callback('« Back', 'NESTFiEvents')]
  ]))
})

bot.action('forDeveloper', async (ctx) => {
  const isBot = ctx.update.callback_query.from.is_bot
  if (isBot) {
    return
  }
  await lmt.removeTokens(1)
  await ctx.answerCbQuery()
  await ctx.editMessageText(`*Another Revolution in Blockchain*

NEST ecosystem is a paradigm revolution to the traditional market mechanism, providing the blockchain world with a whole new range of development tools and creative new assets.

*NEST PVM*
NEST Probability Virtual Machine (PVM) is a virtual machine-like structure based on the basic function library. Developers can develop various exciting applications based on the function library, similar to Ethereum virtual machine (EVM) programming.
Github repository: [NEST-PVM-V1.0](https://github.com/NEST-Protocol/NEST-PVM-V1.0). More [PVM Mechanism](https://nestprotocol.org/docs/Concept/PVM/)

*NEST Oracle*
NEST oracle is the only truly decentralized oracle on the market today.
Github repository: [NEST-Oracle-V4.0](https://github.com/NEST-Protocol/NEST-Oracle-V4.0). [How to Mining](https://nestprotocol.org/docs/Technical-Reference-NEST-Oracle/#how-to-mining/), [How to Call Price](https://nestprotocol.org/docs/Technical-Reference-NEST-Oracle/#how-to-call-price)

More [Developer Doc](https://nestprotocol.org/docs/PVM-Technical-Reference/)

Welcome follow our [Github](https://github.com/NEST-Protocol). We will also develop some targeted airdrop tools, like [this bot](https://github.com/NEST-Protocol/NESTRedEnvelopesBot).
`, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    ...Markup.inlineKeyboard([
      [Markup.button.url('Follow Github', 'https://github.com/NEST-Protocol'), Markup.button.url('Developer Doc', 'https://nestprotocol.org/docs/PVM-Technical-Reference/')],
      [Markup.button.url('New Issues', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues/new'), Markup.button.callback('« Back', 'menu')],
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
    const queryUserRes = await ddbDocClient.send(new GetCommand({
      TableName: 'nest-prize-users',
      Key: {
        user_id: ctx.update.callback_query.from.id,
      },
    }))
    const hCaptcha = queryUserRes.Item?.hCaptcha || undefined
    if (hCaptcha === undefined) {
      await lmt.removeTokens(1)
      try {
        await ctx.editMessageText(`Please click the 'To Verify' button to complete the CAPTCHA, then click '» Next' to continue.`, Markup.inlineKeyboard([
          [Markup.button.url('To Verify', `https://ep6wilhzkgmikzeyhbqbsidorm0biins.lambda-url.ap-northeast-1.on.aws/?user_id=${ctx.update.callback_query.from.id}`)],
          [Markup.button.callback('» Next', 'setUserWallet')],
        ]))
      } catch (e) {
        await ctx.answerCbQuery('Verify First!')
      }
      return
    }
    
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

bot.action('setUserTwitter', async (ctx) => {
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
    const hCaptcha = queryUserRes.Item?.hCaptcha || undefined
    if (hCaptcha === undefined) {
      await lmt.removeTokens(1)
      try {
        await ctx.editMessageText(`Please follow our twitter and click the '🤖️ Verify' button to complete the CAPTCHA, then click '» Next' to continue.`, Markup.inlineKeyboard([
          [Markup.button.url('🐦 Follow', 'https://twitter.com/NEST_Protocol'), Markup.button.url('🤖️ Verify', `https://ep6wilhzkgmikzeyhbqbsidorm0biins.lambda-url.ap-northeast-1.on.aws/?user_id=${ctx.update.callback_query.from.id}`)],
          [Markup.button.callback('» Next', 'setUserTwitter')],
        ]))
      } catch (e) {
        await ctx.answerCbQuery('Verify First!')
      }
      return
    }
    try {
      await ctx.editMessageText("Click Authorize button to bind your twitter, then click 'I have Authorized' to update.", Markup.inlineKeyboard([
        [Markup.button.url('Authorize', `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=dU9nMk54dnQzc0UtNjNwbDRrWno6MTpjaQ&redirect_uri=https://nestdapp.io/twitter&scope=tweet.read%20users.read%20follows.read%20like.read%20offline.access&state=${hashCode(botName)}_${ctx.update.callback_query.from.id}&code_challenge=challenge&code_challenge_method=plain`)],
        [Markup.button.callback('I have Authorized', 'checkTwitter')],
      ]))
    } catch (e) {
      await ctx.answerCbQuery()
    }
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
        UpdateExpression: 'set twitter_name = :twitter_name, twitter_id = :twitter_id, twitter_token = :twitter_token, hCaptcha = :hCaptcha',
        ExpressionAttributeValues: {
          ':twitter_name': twitter_name,
          ':twitter_id': twitter_id,
          ':twitter_token': access_token,
          ':hCaptcha': null,
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
    [Markup.button.callback('Liquidate', 'liquidateInfo')],
  ]))
})

bot.action('liquidateInfo', async (ctx) => {
  const isBot = ctx.update.callback_query.from.is_bot
  if (isBot) {
    return
  }
  // query number of NEST Prize status is pending
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
    const [openResult, pendingResult] = await Promise.all([
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
    ])
    let pendingList = []
    for (const item of pendingResult.Items) {
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
    const openAmount = openResult.Items.reduce((acc, cur) => acc + cur.config.amount - cur.balance, 0)
    const pendingAmount = pendingResult.Items.reduce((acc, cur) => acc + cur.config.amount - cur.balance, 0)
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
    await ctx.editMessageText(`*NEST Prize Liquidate*

Number of open NEST Prize: ${openResult.Count}, had snatched: ${openAmount} NEST.

Number of pending NEST Prize: ${pendingResult.Count}, had snatched: ${pendingAmount} NEST, different users: ${pendingList.length}.`, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Stop All Snatching Prize', 'pending', openResult.Count === 0)],
        [Markup.button.callback('Liquidate All Snatched Prize', 'liquidate', pendingResult.Count === 0)],
        [Markup.button.callback('« Back', 'admin')],
      ])
    })
  } catch (e) {
    console.log(e)
    await lmt.removeTokens(1)
    await ctx.answerCbQuery("Some error occurred.")
  }
})

bot.action('liquidate', async (ctx) => {
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
      await lmt.removeTokens(1)
      await ctx.answerCbQuery("No pending NEST Prize found to send.")
      return
    }
    
    for (const item of result.Items) {
      ddbDocClient.send(new UpdateCommand({
        TableName: 'nest-prize',
        Key: {
          chat_id: item.chat_id,
          message_id: item.message_id,
        },
        UpdateExpression: 'SET #s = :s, #t = :t',
        ConditionExpression: '#s = :ps',
        ExpressionAttributeNames: {
          '#s': 'status',
          '#t': 'ttl',
        },
        ExpressionAttributeValues: {
          ':s': 'processing',
          ':t': Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
          ':ps': 'pending',
        },
      })).catch((e) => {
        console.log(e)
      })
    }
    
    try {
      let data = 'address,amount\n'
      for (const item of pendingList) {
        data += `${item.wallet},${item.amount}\n`
      }
      await lmt.removeTokens(1)
      await ctx.answerCbQuery()
      await ctx.replyWithDocument({
        source: Buffer.from(data),
        filename: `pending.csv`,
      })
    } catch (e) {
      console.log(e)
      await lmt.removeTokens(1)
      await ctx.answerCbQuery("Send csv file failed, please try again later.")
    }
  } catch (e) {
    console.log(e)
    await lmt.removeTokens(1)
    await ctx.answerCbQuery("Fetch pending NEST Prize failed, please try again later.")
  }
})

bot.action('pending', async (ctx) => {
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
      ddbDocClient.send(new UpdateCommand({
        TableName: 'nest-prize',
        Key: {
          chat_id: item.chat_id,
          message_id: item.message_id,
        },
        UpdateExpression: 'SET #s = :s',
        ConditionExpression: '#s = :os',
        ExpressionAttributeNames: {
          '#s': 'status',
        },
        ExpressionAttributeValues: {
          ':s': 'pending',
          ':os': 'open',
        },
      })).catch((e) => console.log(e))
    }
    await lmt.removeTokens(1)
    await ctx.answerCbQuery()
    await ctx.editMessageText(`Stop All Snatching Prize Success!`, Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'liquidateInfo')],
    ]))
  } catch (e) {
    console.log(e)
    ctx.reply("Some error occurred.")
  }
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
              [Markup.button.url('Newcomers', 'https://t.me/NESTRedEnvelopesBot'), Markup.button.url('🤩 Star', 'https://github.com/NEST-Protocol/NESTRedEnvelopesBot')]
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
    if (queryUserRes.Item === undefined || queryUserRes.Item?.wallet === undefined) {
      await ctx.answerCbQuery('Please Update Wallet First!')
      return
    }
    if (queryUserRes.Item?.twitter_id === undefined) {
      await ctx.answerCbQuery('Please Authorize Twitter First!')
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

Click [here](https://y2qpo4q6i7wbwa4jio7mgvuhc40feltc.lambda-url.ap-northeast-1.on.aws/?chat_id=${ctx.update.callback_query.message.chat.id}&message_id=${ctx.update.callback_query.message.message_id}) to check all snatchers.

🌟When [NEST-Oracle-V4.0](https://github.com/NEST-Protocol/NEST-Oracle-V4.0) star reaches 1024, there will be surprises!
`,
              {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_to_message_id: ctx.update.callback_query.message.message_id,
              })
        }
        
        if ((prize.record.length + 1) % 10 === 0 || prize.record.length === prize.config.quantity - 1) {
          await ctx.reply(`🎉🎉🎉 *The latest 10 snatchers are*:
          
${prize.record.slice(-9).map((record) => `@${record.username} have got ${record.amount} NEST!`).join('\n')}
@${ctx.update.callback_query.from.username} have got ${amount} NEST!

Click [here](https://y2qpo4q6i7wbwa4jio7mgvuhc40feltc.lambda-url.ap-northeast-1.on.aws/?chat_id=${ctx.update.callback_query.message.chat.id}&message_id=${ctx.update.callback_query.message.message_id}) to check all snatchers.

🌟When [NEST-Oracle-V4.0](https://github.com/NEST-Protocol/NEST-Oracle-V4.0) star reaches 1024, there will be surprises!
`,
              {
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
chatId: ${config.chatId}
cover: ${config.cover}
auth: ${config.auth}
`, {
              parse_mode: 'Markdown',
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
            UpdateExpression: 'SET wallet = :wallet, hCaptcha = :hCaptcha',
            ExpressionAttributeValues: {
              ':wallet': input,
              ':hCaptcha': null,
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