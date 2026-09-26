const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.listen(3000);
