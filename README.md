# NEST Prize Bot

The NEST Prize Bot is a tool developed by our team for the activity of the NEST community. It can help members of the NEST community to issue and receive NEST Prize in the Telegram group.
Currently, supported network: ```BSC```、```BSC Testnet```

This repository contains:

1. The bot [main program](./index.js)
2. The contract [interface](./abis) used by the bot
3. Get the function [source code](./lambda) of the condition interface
4. A set of [test scripts](./test)

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Example Readmes](#example-readmes)
- [Related Efforts](#related-efforts)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Background

Our development team has developed countless telegram bots for rewarding active users, which is a very exhausting job. Therefore, we decided to develop a general-purpose bot that can help members of the NEST community to distribute and receive NEST red packets in Telegram groups.

The goals for this repository are:

1. Provide a universal red envelope robot for the NEST community
2. Make reward distribution fairer and more transparent
3. Reduce the cost of reward distribution and reduce transaction errors
4. Anti cheating

## Install

This project uses a serverless architecture design, so you need to be familiar with [AWS](https://aws.amazon.com/) related services, including: Lambda, DynamoDB, IAM, CloudWatch, etc.

```sh
$ npm install
```

## Usage

You need to replace some configuration in the source code, including:
1. The private key and public key of the robot account, where the private key needs to be configured in the environment variables of Lambda
2. Create a new Telegram bot account and configure its token in Lambda's environment variables
3. Modify the whitelist of administrators in the original code, ```WHITELIST```
4. Modify the token address in the original code, ```NEST_ADDRESS```
5. The robot account needs to authorize the transfer contract, and FREE_TRANSFER_ADDRESS is the transfer contract address
6. Need to create a DynamoDB database

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

## Example Readmes

[NEST Prize Bot](https://t.me/NESTRedEnvelopesBot)

## Related Efforts

- [telegraf](https://github.com/telegraf/telegraf)
- [ethers.js](https://github.com/ethers-io/ethers.js)
- [axios](https://github.com/axios/axios)

## Maintainers

[@tunogya](https://github.com/tunogya)。

## Contributing

Feel free to dive in! [Open an issue](https://github.com/NEST-Protocol/NESTRedEnvelopesBot/issues/new) or submit PRs.

## License

[MIT](LICENSE) © NEST Protocol
