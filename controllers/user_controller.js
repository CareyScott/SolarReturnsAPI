const req = require("express/lib/request");
const res = require("express/lib/response");
const User = require("../models/user_schema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();


// registering the user
const register = (req, res) => {
  let newUser = new User(req.body);
  // hashing the users password
  newUser.password = bcrypt.hashSync(req.body.password, 10);
// mongoose model query
  newUser.save((err, user) => {
    if (err) {
      return res.status(400).send({
        message: err,
      });
    } else {
      // does not return the users email
      user.password = undefined;
      // return with JWT token
      return res.json({
        // sign token
        token: jwt.sign(
          {
            email: user.email,
            full_name: user.full_name,
            _id: user._id,
          },

          process.env.DECRYPT_STRING
        ),
        userID: user._id

      });
    }
  });
};

// login user
const login = (req, res) => {

  // find user by email. mongoose query
  User.findOne({
    email: req.body.email,
  })
    .then((user) => {
      // if the user is not found or pass does not match return error
      if (!user || !user.comparePassword(req.body.password)) {
        return res.status(401).json({
          message: "Authentication failed. Invalid user or password",
        });
      }
      // create token
      res.json({
        // sign token
        token: jwt.sign(
          {
            email: user.email,
            full_name: user.full_name,
            _id: user._id,
          },

          // decrypt string
          process.env.DECRYPT_STRING
        ),
        userID: user._id
        
      });
    })
    .catch((err) => {
      throw err;
    });
};


// function to require a user to be logged in to use endpoints
const loginRequired = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    return res.status(401).json({
      message: "unauthorized",
    });
  }
};

/////////// DEV /////////////
// getting all users
const getAllUsers = (req, res) => {
  User.find()
    .populate("projects")
    .then((data) => {
      if (data) {
        res.status(200).json(data);
      } else {
        res.status(404).json("No users not found");
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json(err);
    });
};

// getting a single user
const getSingleUser = (req, res) => {
  User.findById(req.params.id)
    .populate("projects")
    .then((data) => {
      if (data) {
        res.status(200).json(data);
      } else {
        res.status(404).json(`User with id: ${req.params.id} not found`);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json(err);
    });
};

module.exports = {
  register,
  loginRequired,
  login,
  getSingleUser,
  getAllUsers,
};
