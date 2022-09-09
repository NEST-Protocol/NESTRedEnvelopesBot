exports.handler = async (event) => {
  const user_id = JSON.parse(event.body)?.user_id ?? undefined
  const wallet = JSON.parse(event.body)?.wallet ?? undefined
  
  if (user_id === undefined && wallet === undefined) {
    return {
      statusCode: 200,
      body: false
    }
  }
  
  return {
    statusCode: 200,
    body: false,
  };
};
