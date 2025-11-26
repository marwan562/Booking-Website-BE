import tourModel from "../../models/tourModel.js";
import subscriptionModel from "../../models/subscriptionModel.js";
import userModel from "../../models/userModel.js";
import destinationModel from "../../models/destinationModel.js";

// Helper function to get date range based on period
const getDateRange = (period) => {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
};

// Helper function to get previous period date range
const getPreviousPeriodRange = (period) => {
  const { start: currentStart } = getDateRange(period);
  const end = new Date(currentStart);
  const start = new Date(currentStart);

  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
};

// Helper function to format dates
const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

// Get Overview Statistics
export const getOverviewStats = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const { start: periodStart } = getDateRange(period);
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(period);

    // Get total counts
    const [totalTours, totalUsers, allSubscriptions] = await Promise.all([
      tourModel.countDocuments(),
      userModel.countDocuments(),
      subscriptionModel
        .find()
        .select("totalPrice payment createdAt refundDetails")
        .lean(),
    ]);

    // Helper function to calculate revenue properly
    const calculateRevenue = (subscriptions) => {
      return subscriptions.reduce((sum, sub) => {
        if (sub.payment === "success") {
          return Number(sum + (sub.totalPrice || 0).toFixed(2));
        } else if (sub.payment === "refunded") {
          // For refunded bookings, subtract the refunded amount
          return Number(sum + (sub.refundDetails?.refundAmount || 0).toFixed);
        }
        // Pending bookings don't count toward revenue
        return Number(sum.toFixed(2));
      }, 0);
    };

    // Calculate current period metrics
    const currentPeriodSubs = allSubscriptions.filter(
      (sub) => new Date(sub.createdAt) >= periodStart
    );

    const currentPeriodRevenue = calculateRevenue(currentPeriodSubs);
    const currentPeriodBookings = currentPeriodSubs.filter(
      (sub) => sub.payment === "success" || sub.payment === "refunded"
    ).length;

    // Calculate previous period metrics
    const previousPeriodSubs = allSubscriptions.filter((sub) => {
      const subDate = new Date(sub.createdAt);
      return subDate >= prevStart && subDate < prevEnd;
    });

    const previousPeriodRevenue = calculateRevenue(previousPeriodSubs);
    const previousPeriodBookings = previousPeriodSubs.filter(
      (sub) => sub.payment === "success" || sub.payment === "refunded"
    ).length;

    // Calculate total metrics (excluding pending)
    const totalRevenue = calculateRevenue(allSubscriptions);
    const totalBookings = allSubscriptions.filter(
      (sub) => sub.payment === "success" || sub.payment === "refunded"
    ).length;

    // Calculate percentage changes
    const revenueChange =
      previousPeriodRevenue > 0
        ? Math.round(
            ((currentPeriodRevenue - previousPeriodRevenue) /
              previousPeriodRevenue) *
              100 *
              10
          ) / 10
        : currentPeriodRevenue > 0
        ? 100
        : 0;

    const bookingsChange =
      previousPeriodBookings > 0
        ? Math.round(
            ((currentPeriodBookings - previousPeriodBookings) /
              previousPeriodBookings) *
              100 *
              10
          ) / 10
        : currentPeriodBookings > 0
        ? 100
        : 0;

    // Get user growth for period
    const currentPeriodUsers = await userModel.countDocuments({
      createdAt: { $gte: periodStart },
    });

    const previousPeriodUsers = await userModel.countDocuments({
      createdAt: { $gte: prevStart, $lt: prevEnd },
    });

    const usersChange =
      previousPeriodUsers > 0
        ? Math.round(
            ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) *
              100 *
              10
          ) / 10
        : currentPeriodUsers > 0
        ? 100
        : 0;

    // Get tour growth for period
    const currentPeriodTours = await tourModel.countDocuments({
      createdAt: { $gte: periodStart },
    });

    const previousPeriodTours = await tourModel.countDocuments({
      createdAt: { $gte: prevStart, $lt: prevEnd },
    });

    const toursChange =
      previousPeriodTours > 0
        ? Math.round(
            ((currentPeriodTours - previousPeriodTours) / previousPeriodTours) *
              100 *
              10
          ) / 10
        : currentPeriodTours > 0
        ? 100
        : 0;

    // Calculate detailed revenue metrics (like your subscription controller)
    // Revenue from successful payments
    // Revenue from successful payments
    const successRevenue = allSubscriptions
      .filter((sub) => sub.payment === "success")
      .reduce((sum, sub) => sum + Number(sub.totalPrice || 0), 0);

    // Total price of refunded bookings (original paid)
    const refundedOriginal = allSubscriptions
      .filter((sub) => sub.payment === "refunded")
      .reduce((sum, sub) => sum + Number(sub.totalPrice || 0), 0);

    // Actual refund given back to user
    const refundedAmount = allSubscriptions
      .filter((sub) => sub.payment === "refunded")
      .reduce(
        (sum, sub) => sum + Number(sub.refundDetails?.refundAmount || 0),
        0
      );

    // Correct net revenue: money in - money out
    const netRevenue = Number(
      (successRevenue - (refundedOriginal - refundedAmount)).toFixed(2)
    );

    const grossRevenue = successRevenue;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: netRevenue, // Net revenue after refunds
        grossRevenue, // Total successful payments
        totalRefunded:
          allSubscriptions
            .filter((sub) => sub.payment === "refunded")
            .reduce((sum, sub) => sum + (sub.totalPrice || 0), 0) -
          refundedAmount,
        refundedAmount, // Amount returned to customers
        totalBookings,
        totalUsers,
        totalTours,
        revenueChange,
        bookingsChange,
        usersChange,
        toursChange,
        successfulBookings: allSubscriptions.filter(
          (sub) => sub.payment === "success"
        ).length,
        pendingBookings: allSubscriptions.filter(
          (sub) => sub.payment === "pending"
        ).length,
        refundedBookings: allSubscriptions.filter(
          (sub) => sub.payment === "refunded"
        ).length,
      },
    });
  } catch (error) {
    console.error("Error in getOverviewStats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overview statistics",
      error: error.message,
    });
  }
};

// Get Revenue Timeline
export const getRevenueTimeline = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const { start } = getDateRange(period);

    const subscriptions = await subscriptionModel
      .find({ createdAt: { $gte: start } })
      .select("totalPrice payment createdAt refundDetails")
      .lean();

    // Generate date map for the period
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const dateMap = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = formatDate(date);
      dateMap[dateStr] = {
        revenue: 0,
        grossRevenue: 0,
        refundedAmount: 0,
        bookings: 0,
        successfulBookings: 0,
        refundedBookings: 0,
        pendingBookings: 0,
      };
    }

    // Populate date map with actual data
    subscriptions.forEach((sub) => {
      const dateStr = formatDate(new Date(sub.createdAt));
      if (dateMap[dateStr]) {
        if (sub.payment === "success") {
          dateMap[dateStr].grossRevenue += sub.totalPrice || 0;
          dateMap[dateStr].revenue += sub.totalPrice || 0;
          dateMap[dateStr].successfulBookings += 1;
          dateMap[dateStr].bookings += 1;
        } else if (sub.payment === "refunded") {
          const refundAmount = sub.refundDetails?.refundAmount || 0;
          const deduction = (sub.totalPrice || 0) - refundAmount;
          dateMap[dateStr].refundedAmount += refundAmount;
          dateMap[dateStr].revenue += refundAmount; // Only count what wasn't refunded
          dateMap[dateStr].refundedBookings += 1;
          dateMap[dateStr].bookings += 1;
        } else if (sub.payment === "pending") {
          dateMap[dateStr].pendingBookings += 1;
        }
      }
    });

    // Convert to array and sort
    const timeline = Object.entries(dateMap)
      .map(([date, stats]) => ({
        date,
        revenue: stats.revenue, // Net revenue (after refunds)
        grossRevenue: stats.grossRevenue, // Total successful payments
        refundedAmount: stats.refundedAmount,
        bookings: stats.bookings,
        successfulBookings: stats.successfulBookings,
        refundedBookings: stats.refundedBookings,
        pendingBookings: stats.pendingBookings,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    console.error("Error in getRevenueTimeline:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue timeline",
      error: error.message,
    });
  }
};

// Get Bookings by Status
export const getBookingsByStatus = async (req, res) => {
  try {
    const bookings = await subscriptionModel.find().select("payment").lean();

    const statusCount = {};
    bookings.forEach((booking) => {
      const status = booking.payment || "pending";
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const total = bookings.length || 1;
    const statusData = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    res.status(200).json({
      success: true,
      data: statusData,
    });
  } catch (error) {
    console.error("Error in getBookingsByStatus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings by status",
      error: error.message,
    });
  }
};

// Get User Growth
export const getUserGrowth = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const { start } = getDateRange(period);

    const users = await userModel
      .find({ createdAt: { $gte: start } })
      .select("createdAt")
      .lean();

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const dateMap = {};
    const now = new Date();

    // Initialize date map
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = formatDate(date);
      dateMap[dateStr] = 0;
    }

    // Count users per day
    users.forEach((user) => {
      const dateStr = formatDate(new Date(user.createdAt));
      if (dateMap[dateStr] !== undefined) {
        dateMap[dateStr] += 1;
      }
    });

    // Calculate cumulative totals
    const totalUsers = await userModel.countDocuments();
    let runningTotal = totalUsers - users.length;

    const growthData = Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, newUsers]) => {
        runningTotal += newUsers;
        return {
          date,
          newUsers,
          totalUsers: runningTotal,
        };
      });

    res.status(200).json({
      success: true,
      data: growthData,
    });
  } catch (error) {
    console.error("Error in getUserGrowth:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user growth",
      error: error.message,
    });
  }
};

// Get Top Tours
export const getTopTours = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const tours = await tourModel
      .find()
      .select("title price totalTravelers averageRating")
      .sort({ totalTravelers: -1 })
      .limit(parseInt(limit))
      .lean();

    const topTours = tours.map((tour) => ({
      _id: tour._id,
      title: typeof tour.title === "string" ? tour.title : tour.title.en,
      bookings: tour.totalTravelers || 0,
      revenue: (tour.totalTravelers || 0) * (tour.price || 0),
      rating: tour.averageRating || 0,
      views: (tour.totalTravelers || 0) * 10, // Estimated views
    }));

    res.status(200).json({
      success: true,
      data: topTours,
    });
  } catch (error) {
    console.error("Error in getTopTours:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top tours",
      error: error.message,
    });
  }
};

// Get Top Destinations
export const getTopDestinations = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const destinations = await destinationModel
      .find()
      .select("city country totalTravelers totalTours")
      .sort({ totalTravelers: -1 })
      .limit(parseInt(limit))
      .lean();

    const topDestinations = destinations.map((dest) => ({
      _id: dest._id,
      name: typeof dest.city === "string" ? dest.city : dest.city.en,
      country:
        typeof dest.country === "string" ? dest.country : dest.country.en,
      bookings: dest.totalTravelers || 0,
      revenue: (dest.totalTravelers || 0) * 150, // Estimated revenue per traveler
      tours: dest.totalTours || 0,
    }));

    res.status(200).json({
      success: true,
      data: topDestinations,
    });
  } catch (error) {
    console.error("Error in getTopDestinations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top destinations",
      error: error.message,
    });
  }
};

// Get Subscription Metrics
export const getSubscriptionMetrics = async (req, res) => {
  try {
    const subscriptions = await subscriptionModel
      .find()
      .select("payment totalPrice createdAt refundDetails")
      .lean();

    const totalSubscribers = subscriptions.length;
    const activeSubscribers = subscriptions.filter(
      (s) => s.payment === "success"
    ).length;

    // Calculate revenue properly (matching your subscription controller)
    const successRevenue = subscriptions
      .filter((s) => s.payment === "success")
      .reduce((sum, s) => sum + (s.totalPrice || 0), 0);

    const refundedAmount = subscriptions
      .filter((s) => s.payment === "refunded")
      .reduce((sum, s) => sum + (s.refundDetails?.refundAmount || 0), 0);

    const totalRefundedOriginal = subscriptions
      .filter((s) => s.payment === "refunded")
      .reduce((sum, s) => sum + (s.totalPrice || 0), 0);

    const grossRevenue = successRevenue;
    const totalRevenue = successRevenue + refundedAmount; // Net revenue
    const totalRefunded = totalRefundedOriginal - refundedAmount; // Amount deducted

    // Calculate growth (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentSubscriptions = subscriptions.filter(
      (s) =>
        new Date(s.createdAt) >= thirtyDaysAgo &&
        (s.payment === "success" || s.payment === "refunded")
    ).length;

    const previousSubscriptions = subscriptions.filter((s) => {
      const date = new Date(s.createdAt);
      return (
        date >= sixtyDaysAgo &&
        date < thirtyDaysAgo &&
        (s.payment === "success" || s.payment === "refunded")
      );
    }).length;

    const growth =
      previousSubscriptions > 0
        ? Math.round(
            ((recentSubscriptions - previousSubscriptions) /
              previousSubscriptions) *
              100 *
              10
          ) / 10
        : recentSubscriptions > 0
        ? 100
        : 0;

    const churnRate =
      totalSubscribers > 0
        ? Math.round(
            ((totalSubscribers - activeSubscribers) / totalSubscribers) * 100
          )
        : 0;

    const avgRevenue =
      activeSubscribers > 0 ? Math.round(grossRevenue / activeSubscribers) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalSubscribers,
        activeSubscribers,
        pendingSubscribers: subscriptions.filter((s) => s.payment === "pending")
          .length,
        refundedSubscribers: subscriptions.filter(
          (s) => s.payment === "refunded"
        ).length,
        churnRate,
        avgRevenue,
        growth,
        grossRevenue, // Total from successful payments
        totalRevenue, // Net revenue after refunds
        totalRefunded, // Amount lost to refunds
        refundedAmount, // Amount returned to customers
      },
    });
  } catch (error) {
    console.error("Error in getSubscriptionMetrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription metrics",
      error: error.message,
    });
  }
};

// Get Category Distribution
export const getCategoryDistribution = async (req, res) => {
  try {
    const tours = await tourModel
      .find()
      .select("category price totalTravelers")
      .lean();

    const categoryStats = {};

    tours.forEach((tour) => {
      const category =
        typeof tour.category === "string" ? tour.category : tour.category.en;
      const categoryName = category || "Other";

      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = { count: 0, revenue: 0 };
      }

      categoryStats[categoryName].count += 1;
      categoryStats[categoryName].revenue +=
        (tour.totalTravelers || 0) * (tour.price || 0);
    });

    const distribution = Object.entries(categoryStats).map(
      ([category, stats]) => ({
        category,
        count: stats.count,
        revenue: stats.revenue,
      })
    );

    res.status(200).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error("Error in getCategoryDistribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category distribution",
      error: error.message,
    });
  }
};

// Get Complete Dashboard Data (all analytics in one call)
export const getDashboard = async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    // Execute all queries in parallel for better performance
    const [
      overview,
      revenueTimeline,
      bookingsByStatus,
      userGrowth,
      topTours,
      topDestinations,
      subscriptionMetrics,
      categoryDistribution,
    ] = await Promise.allSettled([
      getOverviewStatsData(period),
      getRevenueTimelineData(period),
      getBookingsByStatusData(),
      getUserGrowthData(period),
      getTopToursData(5),
      getTopDestinationsData(5),
      getSubscriptionMetricsData(),
      getCategoryDistributionData(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: overview.status === "fulfilled" ? overview.value : null,
        revenueTimeline:
          revenueTimeline.status === "fulfilled" ? revenueTimeline.value : [],
        bookingsByStatus:
          bookingsByStatus.status === "fulfilled" ? bookingsByStatus.value : [],
        userGrowth: userGrowth.status === "fulfilled" ? userGrowth.value : [],
        topTours: topTours.status === "fulfilled" ? topTours.value : [],
        topDestinations:
          topDestinations.status === "fulfilled" ? topDestinations.value : [],
        subscriptionMetrics:
          subscriptionMetrics.status === "fulfilled"
            ? subscriptionMetrics.value
            : null,
        categoryDistribution:
          categoryDistribution.status === "fulfilled"
            ? categoryDistribution.value
            : [],
      },
    });
  } catch (error) {
    console.error("Error in getDashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
};

// Helper functions for getDashboard (to reuse logic)
async function getOverviewStatsData(period) {
  // Same logic as getOverviewStats but returns data directly
  const { start: periodStart } = getDateRange(period);
  const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(period);

  const [totalTours, totalUsers, allSubscriptions] = await Promise.all([
    tourModel.countDocuments(),
    userModel.countDocuments(),
    subscriptionModel
      .find()
      .select("totalPrice payment createdAt refundDetails")
      .lean(),
  ]);

  // Helper function to calculate revenue properly
  const calculateRevenue = (subscriptions) => {
    return subscriptions.reduce((sum, sub) => {
      if (sub.payment === "success") {
        return sum + (sub.totalPrice || 0);
      } else if (sub.payment === "refunded") {
        return sum + (sub.refundDetails?.refundAmount || 0);
      }
      return sum;
    }, 0);
  };

  const currentPeriodSubs = allSubscriptions.filter(
    (sub) => new Date(sub.createdAt) >= periodStart
  );

  const currentPeriodRevenue = calculateRevenue(currentPeriodSubs);

  const previousPeriodSubs = allSubscriptions.filter((sub) => {
    const subDate = new Date(sub.createdAt);
    return subDate >= prevStart && subDate < prevEnd;
  });

  const previousPeriodRevenue = calculateRevenue(previousPeriodSubs);

  const successRevenue = allSubscriptions
    .filter((sub) => sub.payment === "success")
    .reduce((sum, sub) => sum + (sub.totalPrice || 0), 0);

  const refundedAmount = allSubscriptions
    .filter((sub) => sub.payment === "refunded")
    .reduce((sum, sub) => sum + (sub.refundDetails?.refundAmount || 0), 0);

  const totalRefundedOriginal = allSubscriptions
    .filter((sub) => sub.payment === "refunded")
    .reduce((sum, sub) => sum + (sub.totalPrice || 0), 0);

  const netRevenue = successRevenue + refundedAmount;
  const totalRevenue = netRevenue;

  const revenueChange =
    previousPeriodRevenue > 0
      ? Math.round(
          ((currentPeriodRevenue - previousPeriodRevenue) /
            previousPeriodRevenue) *
            100 *
            10
        ) / 10
      : currentPeriodRevenue > 0
      ? 100
      : 0;

  const currentPeriodBookings = currentPeriodSubs.filter(
    (sub) => sub.payment === "success" || sub.payment === "refunded"
  ).length;

  const previousPeriodBookings = previousPeriodSubs.filter(
    (sub) => sub.payment === "success" || sub.payment === "refunded"
  ).length;

  const bookingsChange =
    previousPeriodBookings > 0
      ? Math.round(
          ((currentPeriodBookings - previousPeriodBookings) /
            previousPeriodBookings) *
            100 *
            10
        ) / 10
      : currentPeriodBookings > 0
      ? 100
      : 0;

  return {
    totalRevenue,
    grossRevenue: successRevenue,
    totalRefunded: totalRefundedOriginal - refundedAmount,
    refundedAmount,
    totalBookings: allSubscriptions.filter(
      (sub) => sub.payment === "success" || sub.payment === "refunded"
    ).length,
    totalUsers,
    totalTours,
    revenueChange,
    bookingsChange,
    usersChange: 0,
    toursChange: 0,
    successfulBookings: allSubscriptions.filter(
      (sub) => sub.payment === "success"
    ).length,
    pendingBookings: allSubscriptions.filter((sub) => sub.payment === "pending")
      .length,
    refundedBookings: allSubscriptions.filter(
      (sub) => sub.payment === "refunded"
    ).length,
  };
}

async function getRevenueTimelineData(period) {
  const { start } = getDateRange(period);
  const subscriptions = await subscriptionModel
    .find({ createdAt: { $gte: start } })
    .select("totalPrice payment createdAt refundDetails")
    .lean();

  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const dateMap = {};

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);
    dateMap[dateStr] = {
      revenue: 0,
      grossRevenue: 0,
      bookings: 0,
      successfulBookings: 0,
      refundedBookings: 0,
      pendingBookings: 0,
    };
  }

  subscriptions.forEach((sub) => {
    const dateStr = formatDate(new Date(sub.createdAt));
    if (dateMap[dateStr]) {
      if (sub.payment === "success") {
        dateMap[dateStr].grossRevenue += sub.totalPrice || 0;
        dateMap[dateStr].revenue += sub.totalPrice || 0;
        dateMap[dateStr].successfulBookings += 1;
        dateMap[dateStr].bookings += 1;
      } else if (sub.payment === "refunded") {
        const refundAmount = sub.refundDetails?.refundAmount || 0;
        dateMap[dateStr].revenue += refundAmount;
        dateMap[dateStr].refundedBookings += 1;
        dateMap[dateStr].bookings += 1;
      } else if (sub.payment === "pending") {
        dateMap[dateStr].pendingBookings += 1;
      }
    }
  });

  return Object.entries(dateMap)
    .map(([date, stats]) => ({
      date,
      revenue: stats.revenue,
      grossRevenue: stats.grossRevenue,
      bookings: stats.bookings,
      successfulBookings: stats.successfulBookings,
      refundedBookings: stats.refundedBookings,
      pendingBookings: stats.pendingBookings,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getBookingsByStatusData() {
  const bookings = await subscriptionModel.find().select("payment").lean();
  const statusCount = {};

  bookings.forEach((booking) => {
    const status = booking.payment || "pending";
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  const total = bookings.length || 1;
  return Object.entries(statusCount).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

async function getUserGrowthData(period) {
  const { start } = getDateRange(period);
  const users = await userModel
    .find({ createdAt: { $gte: start } })
    .select("createdAt")
    .lean();
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const dateMap = {};

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);
    dateMap[dateStr] = 0;
  }

  users.forEach((user) => {
    const dateStr = formatDate(new Date(user.createdAt));
    if (dateMap[dateStr] !== undefined) {
      dateMap[dateStr] += 1;
    }
  });

  const totalUsers = await userModel.countDocuments();
  let runningTotal = totalUsers - users.length;

  return Object.entries(dateMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, newUsers]) => {
      runningTotal += newUsers;
      return { date, newUsers, totalUsers: runningTotal };
    });
}

async function getTopToursData(limit) {
  const tours = await tourModel
    .find()
    .select("title price totalTravelers averageRating")
    .sort({ totalTravelers: -1 })
    .limit(limit)
    .lean();

  return tours.map((tour) => ({
    _id: tour._id,
    title: typeof tour.title === "string" ? tour.title : tour.title.en,
    bookings: tour.totalTravelers || 0,
    revenue: (tour.totalTravelers || 0) * (tour.price || 0),
    rating: tour.averageRating || 0,
    views: (tour.totalTravelers || 0) * 10,
  }));
}

async function getTopDestinationsData(limit) {
  const destinations = await destinationModel
    .find()
    .select("city country totalTravelers totalTours")
    .sort({ totalTravelers: -1 })
    .limit(limit)
    .lean();

  return destinations.map((dest) => ({
    _id: dest._id,
    name: typeof dest.city === "string" ? dest.city : dest.city.en,
    country: typeof dest.country === "string" ? dest.country : dest.country.en,
    bookings: dest.totalTravelers || 0,
    revenue: (dest.totalTravelers || 0) * 150,
    tours: dest.totalTours || 0,
  }));
}

async function getSubscriptionMetricsData() {
  const subscriptions = await subscriptionModel
    .find()
    .select("payment totalPrice createdAt refundDetails")
    .lean();

  const totalSubscribers = subscriptions.length;
  const activeSubscribers = subscriptions.filter(
    (s) => s.payment === "success"
  ).length;

  const successRevenue = subscriptions
    .filter((s) => s.payment === "success")
    .reduce((sum, s) => sum + (s.totalPrice || 0), 0);

  const refundedAmount = subscriptions
    .filter((s) => s.payment === "refunded")
    .reduce((sum, s) => sum + (s.refundDetails?.refundAmount || 0), 0);

  const totalRefundedOriginal = subscriptions
    .filter((s) => s.payment === "refunded")
    .reduce((sum, s) => sum + (s.totalPrice || 0), 0);

  const grossRevenue = successRevenue;
  const totalRevenue = successRevenue + refundedAmount;
  const totalRefunded = totalRefundedOriginal - refundedAmount;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const recentSubscriptions = subscriptions.filter((s) => {
    return (
      new Date(s.createdAt) >= thirtyDaysAgo &&
      (s.payment === "success" || s.payment === "refunded")
    );
  }).length;

  const previousSubscriptions = subscriptions.filter((s) => {
    const date = new Date(s.createdAt);
    return (
      date >= sixtyDaysAgo &&
      date < thirtyDaysAgo &&
      (s.payment === "success" || s.payment === "refunded")
    );
  }).length;

  const growth =
    previousSubscriptions > 0
      ? Math.round(
          ((recentSubscriptions - previousSubscriptions) /
            previousSubscriptions) *
            100 *
            10
        ) / 10
      : recentSubscriptions > 0
      ? 100
      : 0;

  return {
    totalSubscribers,
    activeSubscribers,
    pendingSubscribers: subscriptions.filter((s) => s.payment === "pending")
      .length,
    refundedSubscribers: subscriptions.filter((s) => s.payment === "refunded")
      .length,
    churnRate:
      totalSubscribers > 0
        ? Math.round(
            ((totalSubscribers - activeSubscribers) / totalSubscribers) * 100
          )
        : 0,
    avgRevenue:
      activeSubscribers > 0 ? Math.round(grossRevenue / activeSubscribers) : 0,
    growth,
    grossRevenue,
    totalRevenue,
    totalRefunded,
    refundedAmount,
  };
}

async function getCategoryDistributionData() {
  const tours = await tourModel
    .find()
    .select("category price totalTravelers")
    .lean();
  const categoryStats = {};

  tours.forEach((tour) => {
    const category =
      typeof tour.category === "string" ? tour.category : tour.category.en;
    const categoryName = category || "Other";

    if (!categoryStats[categoryName]) {
      categoryStats[categoryName] = { count: 0, revenue: 0 };
    }

    categoryStats[categoryName].count += 1;
    categoryStats[categoryName].revenue +=
      (tour.totalTravelers || 0) * (tour.price || 0);
  });

  return Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    count: stats.count,
    revenue: stats.revenue,
  }));
}
