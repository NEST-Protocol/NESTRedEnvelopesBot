# NEST Red Envelopes Bot

## DynamoDB Design

### Table 

| Partition Key | Sort Key |
|---------------|----------|
| id (Number)   | -        |

The id is snowflake id.

### GSI

#### user-index

| Partition Key    | Sort Key |
|------------------|----------|
| user_id (Number) | -        |

#### red-envelope-index

| Partition Key    | Sort Key            |
|------------------|---------------------|
| chat_id (Number) | message_id (Number) |

## Progress

- [x] Send red envelope
- [x] Receive red envelope with 'Snatch!' button
- [x] Receive red envelope with wallet address
- [x] Receive red envelope with wallet address and async user wallet
- [x] Receive red envelope and async receive record in the group
- [x] Send TX after receive all red envelope 
- [x] User send red envelope history
- [x] Bot admin auth whitelist
- [x] Wallet query 
- [x] Add red envelope cover 

