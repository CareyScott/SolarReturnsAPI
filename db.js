const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();
const init = () => {
  mongoose.set("debug", true);

  mongoose
    .connect(process.env.DB_CONNECT, { useNewUrlParser: true })

    .catch((err) => {
      console.error("error" + err.stack);
      process.exit(1);
    });

  mongoose.connection.on("open", () => {
    console.log("connected to database");
  });
};

mongoose.Promise = global.Promise;

module.exports = init;
