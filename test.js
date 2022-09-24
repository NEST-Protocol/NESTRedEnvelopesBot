const result = [
  {
    wallet: "a",
    amount: 1,
  },
  {
    wallet: "a",
    amount: 1,
  },
  {
    wallet: "b",
    amount: 1,
  },
  {
    wallet: "a",
    amount: 1,
  },
  {
    wallet: "c",
    amount: 1,
  },
];

let pendingList = []
for (const item of result) {
  const index = pendingList.findIndex((i) => i.wallet === item.wallet)
  if (index === -1) {
    if (item.amount > 0) {
      pendingList.push(item)
    }
  } else {
    pendingList[index].amount += item.amount
  }
}

console.log(pendingList)