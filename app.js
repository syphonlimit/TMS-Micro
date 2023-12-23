const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

const dotenv = require("dotenv");

//Setting up config.env file variable
dotenv.config({ path: "./config/config.env" });

//Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down server due to uncaught exception");
  process.exit(1);
});

app.use(express.json());

const routes = require("./routes/routes.js");

app.use("/controller", routes);

app.all("*", (req, res, next) => {
  res.json({
    code: "AS001",
  });
});

const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

//Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log(`ERROR: ${err.stack}`);
  console.log("Shutting down the server due to unhandled promise rejection");
  server.close(() => {
    process.exit(1);
  });
});
