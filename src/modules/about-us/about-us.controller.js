import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import destinationModel from "../../models/destinationModel.js";
import tourModel from "../../models/tourModel.js";

export const getAboutUs = catchAsyncError(async (req, res, next) => {
  const totalDestinations = await destinationModel.countDocuments();

  const totalTours = await tourModel.countDocuments();
  const destinationStats = await destinationModel.aggregate([
    {
      $group: {
        _id: null,
        totalTravelers: { $sum: "$totalTravelers" },
      },
    },
  ]);

  const totalTravelers = destinationStats[0]?.totalTravelers || 0;

  res.status(200).json({
    status: "success",
    data: {
      totalDestinations,
      totalTours,
      totalTravelers,
    },
  });
});
