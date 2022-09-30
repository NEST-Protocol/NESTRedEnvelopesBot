# NEST Prize Bot

Telegram Bot: [NESTRedEnvelopesBot](https://t.me/NESTRedEnvelopesBot)

Query tx on [BscScan](https://bscscan.com/address/0x3b00ce7e2d0e0e905990f9b09a1f515c71a91c10)

## DynamoDB Design

### Table: `nest-prize`

| Attribute Name | Type     | Description             |
|----------------|----------|-------------------------|
| `chat_id`      | `Number` | pk of table             |
| `message_id`   | `Number` | sk of table             |
| `status`       | `String` | pk of GSI(status-index) |

### Table: `nest-prize-users`

| Attribute Name | Type     | Description             |
|----------------|----------|-------------------------|
| `user_id`      | `Number` | pk                      |
| `wallet`       | `Number` | pk of GSI(wallet-index) |
