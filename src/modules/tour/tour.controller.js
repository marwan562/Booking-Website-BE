import tourModel from "../../../DataBase/models/tourModel.js";
import { catchAsyncError } from "../../../middlewares/catchAsyncError.js";
import { removeImage } from "../../../middlewares/deleteImg.js";
import { AppError } from "../../../utilities/AppError.js";
import { ApiFeature } from "../../../utilities/AppFeature.js";
import { ObjectId } from "mongodb";

const createTour = catchAsyncError(async (req, res, next) => {
  const tour = await tourModel.create(req.body);

  !tour && next(new AppError("can't create tour"));
  res.status(200).send({ message: "success", data: tour });
});

const deleteTour = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const tour = await tourModel.findByIdAndDelete(id);

  !tour && next(new AppError("can't delete the tour"));

  removeImage(tour.mainImg.public_id);
  tour.images.forEach((img) => {
    removeImage(img.public_id);
  });
  res.status(200).send({ message: "success" });
});

const updateTour = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const tour = await tourModel.findByIdAndUpdate(id, req.body);
  if (!tour) {
    return next(new AppError("Can't find this tour", 404));
  }
  if (req.body.mainImg) {
    removeImage(tour.mainImg.public_id);
  }
  if (req.body.images) {
    tour?.images?.forEach((img) => {
      removeImage(img.public_id);
    });
  }
  !tour && next(new AppError("can't update the tour"));
  res.status(200).send({ message: "success" });
});

const getAllTour = catchAsyncError(async (req, res, next) => {
  const apiFeature = new ApiFeature(tourModel.find(), req.query)
    .paginate()
    .fields()
    .filter()
    .search()
    .sort();
  const countBlogs = await tourModel.find().countDocuments();
  const pageNumber = Math.ceil(countBlogs / 20);
  const result = await apiFeature.mongoseQuery;
  if (!result) {
    return next(new AppError("can't find tour"));
  }
  res.status(200).send({
    message: "Success",
    data: {
      page: apiFeature.page,
      result,
      pageNumber,
    },
  });
});
const getTourById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const tour = await tourModel.findById(id);
  if (!tour) {
    return next(new AppError("Can't find this tour", 404));
  }
  res.status(200).send({ message: "success", data: tour });
});

const deleteAllTour = catchAsyncError(async (req, res, next) => {
  await tourModel.deleteMany();
  res.status(200).send({ message: "success" });
});
const orderTour = catchAsyncError(async (req, res, next) => {
  for (const item of req.body) {
    const objectId = new ObjectId(item._id);
    await tourModel.updateOne(
      { _id: objectId },
      { $set: { index: item.index } }
    );
  }
  res.status(200).send({ message: "Success" });
});

export {
  orderTour,
  getAllTour,
  createTour,
  getTourById,
  deleteTour,
  updateTour,
  deleteAllTour,
};
