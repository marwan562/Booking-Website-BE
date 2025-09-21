import destinationModel from "../src/models/destinationModel.js";
import tourModel from "../src/models/tourModel.js";

export const updatePopularDestinations = async () => {
  const destinations = await destinationModel.find();

  const ops = [];

  for (const dest of destinations) {
    const tours = await tourModel.find({ destination: dest._id }).lean();

    const totalTravelers = tours.reduce((sum, tour) => sum + (tour.totalTravelers || 0), 0);
    const totalReviews = tours.reduce((sum, tour) => sum + (tour.totalReviews || 0), 0);
    const totalRatingSum = tours.reduce(
      (sum, tour) => sum + (tour.averageRating * (tour.totalReviews || 0)),
      0
    );

    const averageRating = totalReviews > 0 ? totalRatingSum / totalReviews : 0;

    const isPopular = averageRating >= 4.5 && totalTravelers >= 100 && totalReviews >= 20;

    ops.push({
      updateOne: {
        filter: { _id: dest._id },
        update: {
          popular: isPopular,
          totalReviews,
          averageRating: Number(averageRating.toFixed(2)),
          totalTravelers,
          totalTours: tours.length,
        },
      },
    });
  }

  if (ops.length > 0) {
    await destinationModel.bulkWrite(ops);
  }
};
