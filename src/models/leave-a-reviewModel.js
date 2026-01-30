import mongoose, { Schema } from "mongoose";

const schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        comment: { type: String, required: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        images: [{ url: { type: String }, public_id: { type: String } }],
    },
    { timestamps: true }
);

const leaveAReviewModel = mongoose.model("leaveAReview", schema);

export default leaveAReviewModel;
