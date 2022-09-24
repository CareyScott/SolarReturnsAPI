const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new Schema(
  {
    full_name: {
      type: String,
      required: true,
      min: 6,
      trim: true,
      max: 255,
      required: [true, "full name is required"],
    },
    email: {
      type: String,
      required: true,
      min: 6,
      unique: true,
      max: 255,
      lowercase: true,
      trim: true,
      required: [true, "email is required"],
    },
    password: {
      type: String,
      required: true,
      max: 1024,
      min: 6,
      required: [true, "password is required"],
    },
    projects: {
      type: [Schema.Types.ObjectId],
      ref: "Project",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compareSync(password, this.password, function (result) {
    return result;
  });
};
module.exports = model("User", userSchema);
