import destinationModel from "../src/models/destinationModel.js";
import tourModel from "../src/models/tourModel.js";

export const updatePopularDestinations = async () => {
  const destinations = await destinationModel.find();

  for (const dest of destinations) {
    const tours = await tourModel.find({ destination: dest._id }).lean();

    const totalTravelers = tours.reduce((sum, tour) => sum + (tour.totalTravelers || 0), 0);
    const totalReviews = tours.reduce((sum, tour) => sum + (tour.totalReviews || 0), 0);
    const totalRatingSum = tours.reduce((sum, tour) => sum + (tour.averageRating * (tour.totalReviews || 0)), 0);

    const averageRating = totalReviews > 0 ? totalRatingSum / totalReviews : 0;

    const isPopular = averageRating >= 4.5 && totalTravelers >= 100 && totalReviews >= 20;

    await destinationModel.findByIdAndUpdate(dest._id, {
      popular: isPopular,
      totalReviews,
      averageRating: averageRating.toFixed(2),
    });
  }
};
