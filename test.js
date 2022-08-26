const max = 10
const min = 1


for (let i = 0; i < 100; i++) {
  console.log(Math.floor(Math.random() * (max - min + 1) + min))
}

