const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

require("dotenv").config();
require("./db")();


const port = process.env.PORT || "8080";

const {
  getSingleUser,
  getAllUsers,
  editUser,
} = require("./controllers/user_controller");

const {
  register,
  login,
  loginRequired,
} = require("./controllers/user_controller");

const {
  solar_request,
  data_extraction_sum,
  // simplePayback,
} = require("./controllers/solar_controller");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// acquiring json token from headers for authentication
app.use((req, res, next) => {
  if (
    req.headers &&
    req.headers.authorization &&
    req.headers.authorization.split(" ")[0] === "Bearer"
  ) {
    jwt.verify(
      req.headers.authorization.split(" ")[1],
      "azure_jwt_api",
      (err, decode) => {
        if (err) req.user = undefined;
        req.user = decode;
        next();
      }
    );
  } else {
    req.user = undefined;
    next();
  }
});

// users
app.post("/register", register);
app.post("/login", login);
// app.post('/editUser', editUser)

app.get("/solar", solar_request);
app.get("/solardata", data_extraction_sum);
// app.get("/solarpayback", simplePayback);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
