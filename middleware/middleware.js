exports.catchSpecialCharacters = (req, res, next) => {
  //Check if the request parameters contain special characters
  const regex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/
  //we should strip the first /
  //Check if the endpoint contains special characters
  if (regex.test(req.url.slice(1))) {
    return res.json({
      code: "AS002"
    })
  }
  next()
}
