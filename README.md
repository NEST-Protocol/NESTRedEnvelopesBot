# NEST Red Envelopes Bot

## Dynamo Design

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
- [ ] Receive red envelope with wallet address and async user wallet
- [ ] Receive red envelope and async receive record in the group
- [ ] User send red envelope history
- [ ] User receive red envelope history
- [ ] Wallet query 
- [ ] Add red envelope cover 

