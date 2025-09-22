import mongoose from "mongoose";

const imagesSchema = new mongoose.Schema({
  url: { type: String },
  public_id: { type: String },
});

const schema = new mongoose.Schema(
  {
    subject: {
      type: String,
      enum: [
        "My personal information",
        "Technical support",
        "Billing inquiry",
        "General question",
        "Partnership opportunity",
      ],
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    attachedFiles: [imagesSchema],
  },
  { timestamps: true }
);

const contactModel = mongoose.model("contact", schema);
export default contactModel;
