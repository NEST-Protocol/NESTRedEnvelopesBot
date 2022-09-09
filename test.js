const axios = require("axios");
axios('https://osjmcll4xxccobei6huqa7vmo40hhunt.lambda-url.ap-northeast-1.on.aws/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  data: JSON.stringify({
    user_id: "123",
    wallet: "1234"
  })
}).then((res) => {
  console.log(res.data);
})