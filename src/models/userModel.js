import mongoose, { Schema, Types } from "mongoose";
import { hash, compare } from "bcrypt";
import jwt from "jsonwebtoken";

const schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: true },
    phone: { type: Number, required: true },
    age: { type: Number, required: true },
    avatar: { url: { type: String }, public_id: { type: String } },
    nationality: { type: String, required: true },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"],
      default: "other",
    },
    wishList: [{ type: Types.ObjectId, ref: "tour" }],
    code: {
      type: String,
      validate: {
        validator: (val) => /^\d{4}$/.test(val),
        message: "Code must be a 4-digit number",
      },
    },
    confirmedEmail: { type: Boolean, default: false, required: true },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

// Add index for email to improve query performance
schema.index({ email: 1 });

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

schema.methods.generateToken = async function (data) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return jwt.sign(data, process.env.JWT_SECRET, {
    expiresIn: "7d", // Reduced from 30d to 7d for better security
  });
};

schema.methods.comparePassword = async function (password) {
  return await compare(password, this.password);
};

const userModel = mongoose.model("user", schema);

export default userModel;
