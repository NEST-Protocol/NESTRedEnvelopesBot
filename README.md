# NEST Prize Bot

The NEST Prize Bot is a tool developed by our team for the activity of the NEST community. It can record the receipt of Prize and export them.

This repository contains:

1. The bot [main program](./index.js)
2. The contract [interface](./abis) used by the bot
3. Get the function [source code](./lambda) of the condition interface
4. A set of [test scripts](./test)

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Example Bot](#example-bot)
- [Related Efforts](#related-efforts)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Background

Our development team has developed countless telegram bots for rewarding active users, which is a very exhausting job. Therefore, we decided to develop a general-purpose bot that can help members of the NEST community to distribute and receive NEST red packets in Telegram groups.

The goals for this repository are:

1. Record the receipt of NEST Prize
2. Export all the receipt data
3. Reduce the cost of reward distribution and reduce transaction errors
4. Anti cheating

## Install

This project uses a serverless architecture design, so you need to be familiar with [AWS](https://aws.amazon.com/) related services, including: Lambda, DynamoDB, IAM, CloudWatch, etc.

```sh
$ npm install
```

## Usage

You need to replace some configuration in the source code, including:
1. Create a new Telegram bot account and configure its token in Lambda's environment variables
2. Modify the whitelist of administrators in the original code, ```WHITELIST```
3. Need to create a DynamoDB database

### DynamoDB Design

#### Table: `nest-prize`

| Attribute Name | Type     | Description             |
|----------------|----------|-------------------------|
| `chat_id`      | `Number` | pk of table             |
| `message_id`   | `Number` | sk of table             |
| `status`       | `String` | pk of GSI(status-index) |

#### Table: `nest-prize-users`

| Attribute Name | Type     | Description             |
|----------------|----------|-------------------------|
| `user_id`      | `Number` | pk                      |
| `wallet`       | `Number` | pk of GSI(wallet-index) |

## Example Bot

[NEST Prize Bot](https://t.me/NESTRedEnvelopesBot)

## Related Efforts

- [telegraf](https://github.com/telegraf/telegraf)
- [wizardingpay-telegram-bot](https://github.com/wakandalabs/wizardingpay-telegram-bot) is a log-free escrow wallet that supports use in various social software such as Telegram or Discord.

## Maintainers

[@tunogya](https://github.com/tunogya)

## Contributing

Feel free to dive in! [Open an issue](https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues/new) or submit PRs.

## License

[MIT](LICENSE) © NEST Protocol
