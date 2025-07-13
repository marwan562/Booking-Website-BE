import mongoose, { Schema, Types } from "mongoose";
import { hash, compare } from "bcrypt";
import jwt from "jsonwebtoken";

const schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
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
  }
  return next();
});

schema.pre("findByIdAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update?.password) {
    update.password = await hash(update.password, 10);
    this.setUpdate(update);
  }
  return next();
});

schema.pre(/^find/, async function (next) {
  this.select("-wishList");
  next();
});

schema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret._v;
    return ret;
  },
});

schema.set("toObject", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret._v;
    return ret;
  },
});

schema.methods.generateAccessToken = async function () {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET environment variable is not set");
  }

  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};

schema.methods.generateRefreshToken = async function () {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET environment variable is not set");
  }

  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

schema.methods.comparePassword = async function (password) {
  return await compare(password, this.password);
};

const userModel = mongoose.model("user", schema);

export default userModel;
