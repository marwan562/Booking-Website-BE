import mongoose, { Model, Schema, Types } from "mongoose";
import { hash, compare } from "bcrypt";
import jwt from "jsonwebtoken";
const schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: Number, required: true },
    age: { type: Number, required: true },
    avatar: { url: { type: String }, public_id: { type: String } },
    nationality: { type: String, required: true },
    wishList: [{ type: Types.ObjectId, ref: "tour" }],
    code: { type: Number, length: 4 },
    confirmedEmail: { type: Boolean, default: false, required: true },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);
schema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await hash(this.password, 10);
    return next();
  }
  return next();
});
schema.pre("findByIdAndUpdate", async function (next) {
  if (this.isModified("password")) {
    this.password = await hash(this.password, 10);
    return next();
  }
  return next();
});
schema.pre(/^find/, async function (next) {
  this.select("-wishList");
  next();
});
schema.methods.generateToken = async function () {
  return await jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};
schema.methods.comparePassword = async function (password) {
  return await compare(password, this.password);
};

const userModel = mongoose.model("user", schema);

export default userModel;
