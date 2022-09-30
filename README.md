# NEST Prize Bot

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
