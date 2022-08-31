const {Telegraf, Markup, session} = require('telegraf')
const {PutCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand, ScanCommand} = require('@aws-sdk/lib-dynamodb');
const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {Snowflake} = require('nodejs-snowflake');
const {isAddress} = require("ethers/lib/utils");
const {ethers} = require("ethers");
const freeTransferAbi = require("./abis/FreeTransfer.json");
const erc20abi = require("./abis/erc20.json");

//
//    #####
//   #     #  ####  #    # ###### #  ####
//   #       #    # ##   # #      # #    #
//   #       #    # # #  # #####  # #
//   #       #    # #  # # #      # #  ###
//   #     # #    # #   ## #      # #    #
//    #####   ####  #    # #      #  ####
//
const SupportedChainId = {
  BSC: 56,
  BSC_TEST: 97,
}

const NETWORK_URLS = {
  [SupportedChainId.BSC]: `https://bsc-dataseed.binance.org/`,
  [SupportedChainId.BSC_TEST]: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
}

const FREE_TRANSFER_ADDRESS = {
  [SupportedChainId.BSC]: '0x8d8e4d946ED4c818C9ace798C869C6F93cCF3df0',
  [SupportedChainId.BSC_TEST]: '0xA4Cd6C205cEF92aB066177207114B6831194F61f',
}

const NEST_ADDRESS = {
  [SupportedChainId.BSC]: '0x98f8669f6481ebb341b522fcd3663f79a3d1a6a7',
  [SupportedChainId.BSC_TEST]: '0x821edD79cc386E56FeC9DA5793b87a3A52373cdE',
}

const TX_URL = {
  [SupportedChainId.BSC]: 'https://bscscan.com/tx/',
  [SupportedChainId.BSC_TEST]: 'https://testnet.bscscan.com/tx/',
}

const mnemonic = process.env.MNEMONIC

const walletMnemonic = ethers.Wallet.fromMnemonic(mnemonic)

const BSCProvider = new ethers.providers.JsonRpcProvider(NETWORK_URLS[SupportedChainId.BSC]);
// const BSCTestProvider = new ethers.providers.JsonRpcProvider(NETWORK_URLS[SupportedChainId.BSC_TEST]);
const BSCProviderWithSinger = walletMnemonic.connect(BSCProvider)
// const BSCTestProviderWithSinger = walletMnemonic.connect(BSCTestProvider)

// const BSCTestFreeTransferContract = new ethers.Contract(FREE_TRANSFER_ADDRESS[SupportedChainId.BSC_TEST], freeTransferAbi, BSCTestProviderWithSinger)
const BSCFreeTransferContract = new ethers.Contract(FREE_TRANSFER_ADDRESS[SupportedChainId.BSC], freeTransferAbi, BSCProviderWithSinger)
// const NESTTestContract = new ethers.Contract(NEST_ADDRESS[SupportedChainId.BSC_TEST], erc20abi, BSCTestProviderWithSinger)
const NESTContract = new ethers.Contract(NEST_ADDRESS[SupportedChainId.BSC], erc20abi, BSCProviderWithSinger)

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

const uid = new Snowflake({
  custom_epoch: 1656604800000,
  instance_id: 1,
});

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
  
  // chat_id in [2130493951, 5035670602, 552791389] , pass, otherwise, return
  if (chat_id !== 2130493951 && chat_id !== 5035670602 && chat_id !== 552791389) {
    await ctx.reply('Sorry, you are not allowed to use this bot!')
    return
  }
  replyL1MenuContent(ctx)
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
    [Markup.button.callback('Send Red Envelopes', 'set-config')],
    [Markup.button.callback('History', 'history')],
    [Markup.button.callback('Liquidate', 'liquidate-info')],
  ]))
}

const editReplyL1MenuContent = async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.editMessageText('Welcome to NEST Red Envelopes Bot!', Markup.inlineKeyboard([
    [Markup.button.callback('Send Red Envelopes', 'set-config')],
    [Markup.button.callback('History', 'history')],
    [Markup.button.callback('Liquidate', 'liquidate-info')],
  ]))
}

bot.command('menu', replyL1MenuContent)
bot.action('backToL1MenuContent', editReplyL1MenuContent)

//
//   #        #####     #     #
//   #       #     #    #     # #  ####  #####  ####  #####  #   #
//   #             #    #     # # #        #   #    # #    #  # #
//   #        #####     ####### #  ####    #   #    # #    #   #
//   #       #          #     # #      #   #   #    # #####    #
//   #       #          #     # # #    #   #   #    # #   #    #
//   ####### #######    #     # #  ####    #    ####  #    #   #
//
const editReplyL2HistoryContent = async (ctx) => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    FilterExpression: 'creator = :creator',
    ExpressionAttributeValues: {
      ':creator': ctx.update.callback_query.from.id,
    }
  })).catch(() => {
    ctx.answerCbQuery("Some error occurred, please try again later.")
  })
  await ctx.answerCbQuery()
  const quantity = result.Items.reduce((acc, cur) => acc + cur.config.quantity, 0)
  const totalWrap = result.Items.reduce((acc, cur) => acc + cur.config.amount, 0)
  const left = result.Items.reduce((acc, cur) => acc + cur.balance, 0)
  await ctx.editMessageText(`*NEST Red Envelopes History*

Times of red envelopes sent: ${result.Count}
Number of red envelopes sent: ${quantity}
Total sent: ${totalWrap} NEST
Remaining available: ${left} NEST`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back', 'backToL1MenuContent')],
        ])
      })
}

bot.action('history', editReplyL2HistoryContent)

bot.action('backToL2HistoryContent', editReplyL2HistoryContent)

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
  // query number of red envelope status is pending
  try {
    const [pendingResult, processingResult] = await Promise.all([
      ddbDocClient.send(new ScanCommand({
        TableName: 'nest-red-envelopes',
        FilterExpression: '#s = :s',
        ExpressionAttributeNames: {
          '#s': 'status',
        },
        ExpressionAttributeValues: {
          ':s': 'pending',
        },
      })),
      ddbDocClient.send(new ScanCommand({
        TableName: 'nest-red-envelopes',
        FilterExpression: '#s = :s',
        ExpressionAttributeNames: {
          '#s': 'status',
        },
        ExpressionAttributeValues: {
          ':s': 'processing',
        },
      }))
    ])
    const balance = Number(ethers.utils.formatEther(await NESTContract.balanceOf('0x3B00ce7E2d0E0E905990f9B09A1F515C71a91C10')))
    const pendingAmount = pendingResult.Items.reduce((acc, cur) => acc + cur.config.amount, 0)
    await ctx.answerCbQuery()
    await ctx.editMessageText(`*NEST Red Envelopes Liquidate*
  
Number of pending red envelopes: ${pendingResult.Count}, total amount: ${pendingAmount} NEST.
Bot wallet balance: ${balance} NEST.

Number of processing red envelopes: ${processingResult.Count}. Please check out TX and close that.`, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Liquidate All', 'liquidate', pendingResult.Count === 0 || balance < pendingAmount)],
        [Markup.button.callback('Close All', 'close', processingResult.Count === 0)],
        [Markup.button.callback('« Back', 'backToL1MenuContent')],
      ])
    })
  } catch (e) {
    console.error(e)
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
  // query number of red envelope status is pending
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    FilterExpression: '#s = :s',
    ExpressionAttributeNames: {
      '#s': 'status',
    },
    ExpressionAttributeValues: {
      ':s': 'pending',
    },
  })).catch(() => {
    ctx.answerCbQuery("Some error occurred, please try again later.")
  });
  
  let pendingList = []
  for (const item of result.Items) {
    pendingList.push.apply(pendingList, item.record)
  }
  
  // send tx
  const addressList = pendingList.map(item => item.wallet)
  const tokenAmountList = pendingList.map(item => ethers.BigNumber.from(item.amount).mul(ethers.BigNumber.from(10).pow(18)).toString())
  try {
    const res = await BSCFreeTransferContract.transfer(
        addressList,
        tokenAmountList,
        NEST_ADDRESS[SupportedChainId.BSC_TEST],
    )
    // set them to processing, and record tx hash
    for (const item of result.Items) {
      await ddbDocClient.send(new UpdateCommand({
        TableName: 'nest-red-envelopes',
        Key: {
          id: item.id,
        },
        UpdateExpression: 'SET #s = :s, #h = :h',
        ExpressionAttributeNames: {
          '#s': 'status',
          '#h': 'hash',
        },
        ExpressionAttributeValues: {
          ':s': 'processing',
          ':h': res.hash,
        },
      })).catch(() => {
        ctx.answerCbQuery("Some error occurred, please try again later.")
      });
      await ctx.telegram.sendMessage(item.config.chatId, `Your red envelope is processing, please check out TX: ${TX_URL[SupportedChainId.BSC_TEST]}${res.hash}`)
    }
    await ctx.answerCbQuery('Liquidate Success!')
    await ctx.editMessageText(`TX hash: ${TX_URL[SupportedChainId.BSC_TEST]}${res.hash}`, Markup.inlineKeyboard([
      [Markup.button.callback('Close All', 'close')],
      [Markup.button.callback('« Back', 'backToL1MenuContent')],
    ]))
  } catch (e) {
    await ctx.answerCbQuery("Some error occurred, please try again later.")
  }
}

bot.action('liquidate', editReplyL2DoLiquidateContent)

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
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: 'nest-red-envelopes',
    FilterExpression: '#s = :s',
    ExpressionAttributeNames: {
      '#s': 'status',
    },
    ExpressionAttributeValues: {
      ':s': 'processing',
    },
  })).catch(() => {
    ctx.answerCbQuery("Some error occurred, please try again later.")
  });
  for (const item of result.Items) {
    await ddbDocClient.send(new UpdateCommand({
      TableName: 'nest-red-envelopes',
      Key: {
        id: item.id,
      },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: {
        '#s': 'status',
      },
      ExpressionAttributeValues: {
        ':s': 'close',
      },
    }));
  }
  await ctx.answerCbQuery('Close Success!')
  await ctx.editMessageText(`Close Success!`, Markup.inlineKeyboard([
    [Markup.button.callback('« Back', 'backToL2LiquidateInfoContent')],
  ]))
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
  await ctx.answerCbQuery()
  await ctx.editMessageText(`Enter red envelope config with json format.
  
*parameters:*
token: token symbol
quantity: number of red envelopes
amount: amount of all red envelopes
max: max amount of each red envelope
min: min amount of each red envelope
text: best wishes
chatId: target chatId

For example: { "token": "NEST", "quantity": 10, "amount": 20, "max": 10, "min": 1, "text": "This is a NEST Red Envelope. @NESTRedEnvelopesBot", "chatId": "@nesttestredenvelopes"}`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back', 'backToL1MenuContent')],
    ])
  })
  ctx.session = {intent: 'config'}
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
  const config = ctx.session?.config
  if (config) {
    try {
      // send message to chat_id, record chat_id and message_id to dynamodb
      const res = await ctx.telegram.sendMessage(config.chatId, `${config.text}

Click snatch button or reply your wallet address!`, {
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
            creator: ctx.from.id,
            created_at: new Date().getTime(),
            updated_at: new Date().getTime(),
            record: [],
          },
        })).catch(() => {
          ctx.answerCbQuery("Some error occurred, please try again later.")
        })
        await ctx.answerCbQuery('Red Envelopes Sent Success!')
        await editReplyL1MenuContent(ctx)
      }
    } catch (e) {
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
  // check user info in dynamodb
  const queryUserRes = await ddbDocClient.send(new QueryCommand({
    ExpressionAttributeNames: {'#user': 'user_id'},
    TableName: 'nest-red-envelopes',
    IndexName: 'user-index',
    KeyConditionExpression: '#user = :user',
    ExpressionAttributeValues: {
      ':user': ctx.update.callback_query.from.id,
    },
  })).catch(() => {
    ctx.answerCbQuery("Some error occurred, please try again later.")
  });
  // If no user info do nothing.
  if (queryUserRes.Count === 0) {
    await ctx.answerCbQuery('Please reply your wallet address in the group directly!')
    return
  }
  const user = queryUserRes.Items[0]
  const queryRedEnvelopeRes = await ddbDocClient.send(new QueryCommand({
    ExpressionAttributeNames: {'#chat_id': 'chat_id', '#message_id': 'message_id'},
    TableName: 'nest-red-envelopes',
    IndexName: 'red-envelope-index',
    KeyConditionExpression: '#chat_id = :chat_id AND #message_id = :message_id',
    ExpressionAttributeValues: {
      ':chat_id': ctx.update.callback_query.message.chat.id,
      ':message_id': ctx.update.callback_query.message.message_id,
    },
  })).catch(() => {
    ctx.answerCbQuery("Some error occurred, please try again later.")
  })
  if (queryRedEnvelopeRes.Count === 0) {
    ctx.answerCbQuery("This red envelope is not found.")
    return
  }
  const redEnvelop = queryRedEnvelopeRes.Items[0]
  if (redEnvelop.record.some(record => record.user_id === ctx.update.callback_query.from.id)) {
    await ctx.answerCbQuery('You have already snatched this red envelope!')
    return
  }
  // check if red envelope is open
  if (redEnvelop.status !== 'open') {
    await ctx.answerCbQuery(`Sorry, you are late. ${redEnvelop.config.amount} NEST have been given away.
Please pay attention to the group news. Good luck next time.`)
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
        username: ctx.update.callback_query.from.username,
        amount,
        wallet: user.wallet,
        created_at: new Date().getTime(),
      }],
      ':status': status,
    }
  })).catch(() => {
    ctx.answerCbQuery("Some error occurred, please try again later.")
  })
  await ctx.answerCbQuery(`Congratulations, you have got ${amount} NEST.`)
  await ctx.reply(`Congratulations, ${ctx.update.callback_query.from.username ?? ctx.update.callback_query.from.id} have got ${amount} NEST.`)
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
    if (isAddress(input)) {
      // update wallet address in dynamodb
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
        ctx.answerCbQuery("Some error occurred, please try again later.")
      })
      // auto snatch red envelope
      const queryRedEnvelopeRes = await ddbDocClient.send(new QueryCommand({
        ExpressionAttributeNames: {'#chat_id': 'chat_id', '#message_id': 'message_id', '#status': 'status'},
        TableName: 'nest-red-envelopes',
        IndexName: 'red-envelope-index',
        KeyConditionExpression: '#chat_id = :chat_id AND #message_id < :message_id',
        FilterExpression: '#status = :status',
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
      if (redEnvelop.record.some(record => record.user_id === ctx.message.from.id)) {
        await ctx.answerCbQuery('You have already snatched this red envelope!')
        return
      }
      // check if red envelope is open
      if (redEnvelop.status !== 'open') {
        await ctx.answerCbQuery(`Sorry, you are late. ${redEnvelop.config.amount} NEST have been given away.
Please pay attention to the group news. Good luck next time.`)
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
            user_id: ctx.message.from.id,
            username: ctx.message.from.username,
            amount,
            wallet: input,
            created_at: new Date().getTime(),
          }],
          ':status': status,
        }
      })).catch(() => {
        ctx.answerCbQuery("Some error occurred, please try again later.")
      })
      ctx.reply(`Congratulations, ${ctx.message.from.username ?? ctx.message.from.id} have got ${amount} NEST.

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
        if (config.token !== 'NEST') {
          ctx.answerCbQuery('Token must be NEST. Please try again later.')
          return
        }
        if (config.min > config.max) {
          ctx.answerCbQuery('Min amount must be less than max amount. Please try again later.')
          return
        }
        if (config.quantity < 1) {
          ctx.answerCbQuery('Quantity must be greater than 0. Please try again later.')
          return
        }
        const balance = Number(ethers.utils.formatEther(await NESTContract.balanceOf('0x3B00ce7E2d0E0E905990f9B09A1F515C71a91C10')))
        if (config.amount > balance) {
          ctx.answerCbQuery(`Amount must be less than ${balance} NEST. Please try again later.`)
          return
        }
        await ctx.reply(`Check it again:

token: ${config.token},
quantity: ${config.quantity},
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
        ctx.answerCbQuery('Sorry, I cannot understand your config. Please try again.')
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