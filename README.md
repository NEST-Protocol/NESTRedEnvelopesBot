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