import mongoose, { Schema, Types } from "mongoose";

const schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  mainImg: {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  images: [
    {
      url: { type: String },
      public_id: { type: String },
    },
  ],
  index: { type: Number, default: -1 },

  options: [
    {
      name: { type: String },
      price: { type: Number },
      childPrice: {
        type: Number,
        default: function () {
          return this.price * 0.5;
        },
      },
    },
  ],
  isRepeated: { type: Boolean, default: true },
  repeatTime: [{ type: String }],
  repeatDays: [
    {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
  ],
  category: { type: String, required: true },
  tags: [{ type: String, min: 2, max: 50 }],
  mapDetails: { type: String },
  hasOffer: { type: Boolean, default: false },
  location: {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  inclusions: [{ type: String }],
  exclusions: [{ type: String }],
  adultPricing: [
    {
      adults: { type: Number, required: true },
      price: { type: Number, required: true },
      totalPrice: {
        type: Number,
        default: function () {
          return this.adults * this.price;
        },
      },
    },
  ],
  childrenPricing: [
    {
      children: { type: Number, required: true },
      price: { type: Number, required: true },
      totalPrice: {
        type: Number,
        default: function () {
          return this.children * this.price;
        },
      },
    },
  ],
  price: {
    type: Number,
  },
  duration: { type: String },
  itinerary: { type: String },
  historyBrief: { type: String, min: 2 },
});

schema.pre("save", function (next) {
  if (!this.price) {
    // Calculate the price based on adultPricing
    this.price = this.adultPricing[0].totalPrice;
  }
  next();
});

const tourModel = mongoose.model("tour", schema);

export default tourModel;
