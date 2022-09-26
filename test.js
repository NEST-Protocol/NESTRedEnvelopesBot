const {ethers} = require("ethers");

const main = async () => {
  const result = {
    Items: [
      {
        record: [
          {
            wallet: 'b',
            amount: 1,
          },
          {
            wallet: 'a',
            amount: 1,
          },
          {
            wallet: 'b',
            amount: 1,
          },
          {
            wallet: 'c',
            amount: 1,
          }
        ]
      },
      {
        record: [
          {
            wallet: 'a',
            amount: 1,
          },
          {
            wallet: 'a',
            amount: 1,
          },
        ]
      }
    ]
  }
  let pendingList = []
  for (const item of result.Items) {
    for (const user of item.record) {
      const index = pendingList.findIndex((i) => i.wallet === user.wallet)
      if (index === -1) {
        if (user.amount > 0) {
          pendingList.push(user)
        }
      } else {
        if (user.amount > 0) {
          pendingList[index].amount += user.amount
        }
      }
    }
  }
  console.log('pendingList', pendingList)
}

main()
