exports.handler = async (event) => {
  const user_id = event?.queryStringParameters?.user_id ?? undefined
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: `
<html>
<head>
    <meta charset="utf-8">
    <script src="https://js.hcaptcha.com/1/api.js/" async defer></script>
    <title>hCaptcha</title>
</script>
</head>
<body>
<div>
    <script>
    function verified(token) {
      const data = {
        token: token,
        user_id: "${user_id}"
      };
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("readystatechange", function() {
        if(this.readyState === 4) {
          console.log(this.responseText);
        }
      });
      xhr.open("POST", "https://a5kxw3ttjnkvs4cgingubrwwaq0phjgh.lambda-url.ap-northeast-1.on.aws/", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
      xhr.send(JSON.stringify(data));
      // console.log request
      console.log(xhr);
    }
    </script>
    <div class="h-captcha" data-sitekey="c7d21c4c-e746-4263-8268-b1c25ece4cb7" data-callback="verified"></div>
</div>
</body>
</html>
`,
  };
};
