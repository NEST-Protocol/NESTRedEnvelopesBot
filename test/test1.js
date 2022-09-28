let pendingList = []

const result = {
  Items: [
    {
      id: '1',
      record: [
        {
          wallet: 'A',
          amount: 1,
        },
        {
          wallet: 'a',
          amount: 1,
        },
        {
          wallet: 'a',
          amount: 1,
        },
      ]
    },
    {
      id: '2',
      record: [
        {
          wallet: 'a',
          amount: 1,
        }
      ]
    },
    {
      id: '3',
      record: [
        {
          wallet: 'a',
          amount: 1,
        }
      ]
    },
  ]
}

for (const item of result.Items) {
  let walletMap = {}
  for (const user of item.record) {
    if (walletMap[user.wallet.toLowerCase()]) {
      continue
    }
    walletMap[user.wallet.toLowerCase()] = true
    const index = pendingList.findIndex((i) => i.wallet.toLowerCase() === user.wallet.toLowerCase())
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

console.log(pendingList)