import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { removeImage } from "../../middlewares/deleteImg.js";
import { AppError } from "../../utilities/AppError.js";
import testimonialModel from "../../models/testimonialModel.js";

const createTestimonial = catchAsyncError(async (req, res, next) => {
  const testimonial = new testimonialModel(req.body);
  await testimonial.save();
  res.status(200).send({ message: "success", data: testimonial });
});

const deleteTestimonial = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const testimonial = await testimonialModel.findByIdAndDelete(id);
  if (!testimonial) {
    return next(new AppError("Testimonial not found", 404));
  }
  res.status(200).send({ message: "success", data: "testimonial deleted" });
});

const getAllTestimonial = catchAsyncError(async (req, res, next) => {
  const testimonials = await testimonialModel.find();
  if (!testimonials) {
    return next(new AppError("Testimonials not found", 404));
  }
  res.status(200).send({ message: "success", data: testimonials });
});
const editTestimonial = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const testimonial = await testimonialModel.findByIdAndUpdate(id, req.body);
  if (req.body.avatar) {
    removeImage(testimonial.avatar.public_id);
  }
  if (!testimonial) {
    return next(new AppError("Testimonial not updated", 404));
  }
  res.status(200).send({ message: "success", data: "testimonial updated " });
});

export {
  getAllTestimonial,
  createTestimonial,
  deleteTestimonial,
  editTestimonial,
};
