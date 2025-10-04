import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import subscriptionModel from "../../models/subscriptionModel.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";
import tourModel from "../../models/tourModel.js";
import userModel from "../../models/userModel.js";
import Stripe from "stripe";
import sendConfirmationEmail from "../../utilities/Emails/send-confirmation-email.js";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

dotenv.config();

const FAWATERK_URL_ENV =
  process.env.NODE_ENV === "development" ? "staging" : "app";

export const handleFaildPayment = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  jwt.verify(
    token,
    process.env.PAYMENT_TOKEN_SECRET,
    async function (err, decoded) {
      if (err) return next(new AppError(err.message));

      const { subscriptionId } = decoded;
      const subscription = await subscriptionModel.findById(subscriptionId);

      res.redirect(
        `${process.env.FRONT_END_URL}/account/user/${subscription.userDetails._id}/${subscriptionId}/orderFailed`
      );
    }
  );
});
export const handlePendingPayment = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  jwt.verify(
    token,
    process.env.PAYMENT_TOKEN_SECRET,
    async function (err, decoded) {
      if (err) return next(new AppError(err.message));

      const { subscriptionId } = decoded;
      const subscription = await subscriptionModel.findById(subscriptionId);

      res.redirect(
        `${process.env.FRONT_END_URL}/account/user/${subscription.userDetails._id}/${subscriptionId}/orderPending`
      );
    }
  );
});
export const handleSuccessPayment = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  jwt.verify(
    token,
    process.env.PAYMENT_TOKEN_SECRET,
    async function (err, decoded) {
      if (err) return next(new AppError(err.message));

      const { subscriptionId } = decoded;
      const subscription = await subscriptionModel
        .findByIdAndUpdate(
          subscriptionId,
          { payment: "success" },
          { new: true }
        )
        .populate("tourDetails");

      if (subscription.payment == "success") {
        return next(new AppError("The subscription has been paid", 200));
      }
      if (!subscription)
        return next(new AppError("Subscription not found", 404));
      const adults = subscription.adultPricing?.adults || 0;
      const children = subscription.childrenPricing?.children || 0;

      const optionsTotal =
        subscription.options?.reduce((sum, opt) => {
          return sum + (opt.number || 0) + (opt.numberOfChildren || 0);
        }, 0) || 0;

      const totalTravelers = adults + children + optionsTotal;
      await tourModel.findByIdAndUpdate(subscription.tourDetails._id, {
        $inc: { totalTravelers },
      });

      res.redirect(
        `${process.env.FRONT_END_URL}/account/user/${subscription.userDetails._id}/${subscriptionId}/orderConfirmed`
      );
    }
  );
});

export const fwaterk = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { currency } = req.body;
  const { _id: userId } = req.user;
  const { data } = await axios.get(
    "https://api.exchangerate-api.com/v4/latest/USD"
  );
  const EGP = data.rates.EGP;
  const EUR = data.rates.EUR;
  let subscription = await subscriptionModel.findOne({
    _id: id,
    userDetails: userId,
  });
  if (subscription.payment == "success") {
    return next(new AppError("The subscription has been paid", 200));
  }
  if (subscription) {
    let { options, adultPricing, childrenPricing, totalPrice } = subscription;
    let cartItems = [];
    let price =
      currency === "EGP"
        ? adultPricing.price * EGP
        : currency === "EUR"
        ? adultPricing.price * EUR
        : adultPricing.price;

    cartItems.push({
      name: "adult",
      price,
      quantity: adultPricing.adults,
    });
    if (childrenPricing.totalPrice > 0) {
      let price =
        currency === "EGP"
          ? childrenPricing.price * EGP
          : currency === "EUR"
          ? childrenPricing.price * EUR
          : childrenPricing.price;

      cartItems.push({
        name: "child",
        price,
        quantity: childrenPricing.children,
      });
    }

    if (options) {
      options.forEach((option) => {
        let price =
          currency === "EGP"
            ? option.totalPrice * EGP
            : currency === "EUR"
            ? option.totalPrice * EUR
            : option.totalPrice;

        cartItems.push({
          name: option.name,
          price,
          quantity: 1,
        });
      });
    }
    const [first_name, last_name = ""] =
      subscription.userDetails.name.split(" ");

    const customer = {
      first_name,
      last_name,
      email: subscription.userDetails.email,
      phone: subscription.userDetails.phone,
    };
    const token = jwt.sign(
      { subscriptionId: req.params.id },
      process.env.PAYMENT_TOKEN_SECRET,
      {
        expiresIn: "15m",
      }
    );

    const convertedTotalPrice =
      currency == "EGP"
        ? totalPrice * EGP
        : currency == "EUR"
        ? totalPrice * EUR
        : totalPrice;

    const currencyPayment =
      currency == "EUR" ? "EUR" : currency == "EGP" ? "EGP" : "USD";

    try {
      const result = await createInvoiceLink(
        cartItems,
        customer,
        convertedTotalPrice,
        token,
        currencyPayment
      );
      res.status(200).send(result);
    } catch (error) {
      next(new AppError(error));
    }
  } else {
    return next(new AppError("can't find the subscription"));
  }
});

async function createInvoiceLink(
  cartItems,
  customer,
  cartTotal,
  token,
  currency = "USD"
) {
  const data = {
    payment_method_id: 2,
    cartTotal,
    currency,
    customer,
    redirectionUrls: {
      successUrl: `${process.env.BACK_END_URL}/api/payment/handelPassCheckout/${token}`,
      failUrl: `${process.env.BACK_END_URL}/api/payment/handelFaildPass/${token}`,
      pendingUrl: `${process.env.BACK_END_URL}/api/payment/handelPendingPass/${token}`,
    },
    cartItems,
    sendEmail: true,
  };

  try {
    const response = await axios.post(
      `https://${FAWATERK_URL_ENV}.fawaterk.com/api/v2/invoiceInitPay`,
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN_FWATERK}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data ||
      error.message ||
      "Unknown error occurred while creating the invoice.";

    console.error(
      "Fawaterk API Error:",
      JSON.stringify(errorMessage || error, null, 2)
    );

    throw new Error(
      error.response?.data?.message ||
        "Something went wrong while creating the invoice."
    );
  }
}

export const stripeSessionCompleted = catchAsyncError(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "payment_intent.succeeded"
  ) {
    const eventObject = event.data.object;

    let paymentIntentId;
    let metadata;

    if (event.type === "checkout.session.completed") {
      paymentIntentId = eventObject.payment_intent;
      metadata = eventObject.metadata;
      console.log(
        "checkout.session.completed - PaymentIntent ID:",
        paymentIntentId
      );
    } else if (event.type === "payment_intent.succeeded") {
      paymentIntentId = eventObject.id;
      metadata = eventObject.metadata;
      console.log(
        "payment_intent.succeeded - PaymentIntent ID:",
        paymentIntentId
      );
    }

    if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
      console.error("Invalid or missing payment intent ID:", paymentIntentId);
      return res.status(400).json({ error: "Invalid payment intent ID" });
    }

    const locale = metadata.locale || "en";
    const currency = metadata.currency || "USD";
    const userId = metadata.userId;
    const bookingRefsString = metadata.bookingRefs;

    if (!bookingRefsString) {
      console.error("No bookingRefs found in metadata");
      return res.status(400).json({ error: "No bookingRefs found" });
    }

    if (!userId) {
      console.error("No userId found in metadata");
      return res.status(400).json({ error: "No userId found" });
    }

    const bookingRefsArray = bookingRefsString
      .split(",")
      .map((ref) => ref.trim())
      .filter(Boolean);

    if (bookingRefsArray.length === 0) {
      console.error("No valid bookingRefs found");
      return res.status(400).json({ error: "No valid bookingRefs found" });
    }

    try {
      const subscriptions = await subscriptionModel.find({
        userDetails: userId,
        payment: "pending",
        bookingReference: { $in: bookingRefsArray },
      });

      if (subscriptions.length === 0) {
        console.warn("No pending subscriptions found for user:", userId);
        console.warn("Booking refs searched:", bookingRefsArray);
        return res.json({
          received: true,
          message: "No matching subscriptions found",
        });
      }

      console.log(
        `Found ${subscriptions.length} pending subscriptions to update`
      );

      const updatePromises = subscriptions.map((subscription) => {
        subscription.payment = "success";
        subscription.paymentIntentId = paymentIntentId;
        console.log(
          `Updating booking ${subscription.bookingReference} with paymentIntentId: ${paymentIntentId}`
        );
        return subscription.save();
      });

      await Promise.all(updatePromises);

      console.log("All subscriptions updated successfully");

      const populatedSubscriptions = await subscriptionModel
        .find({
          _id: { $in: subscriptions.map((s) => s._id) },
        })
        .populate("tourDetails userDetails");

      if (populatedSubscriptions.length === 0) {
        console.error("No populated subscriptions found after update");
        return res
          .status(500)
          .json({ error: "Failed to fetch booking details" });
      }

      const user = populatedSubscriptions[0].userDetails;
      if (!user || !user.email) {
        console.error("User details or email missing for subscriptions");
        return res.status(500).json({ error: "User details incomplete" });
      }

      const emailData = {
        bookings: populatedSubscriptions,
        totalAmount: populatedSubscriptions.reduce(
          (sum, b) => sum + b.totalPrice,
          0
        ),
        user,
        currency,
        locale,
        coupon: populatedSubscriptions.every(
          (b) =>
            JSON.stringify(b.coupon) ===
            JSON.stringify(populatedSubscriptions[0].coupon)
        )
          ? populatedSubscriptions[0].coupon
          : null,
        sendToAdmins: false,
      };

      try {
        await sendConfirmationEmail({
          email: user.email,
          type: "confirmation",
          data: emailData,
        });
      } catch (error) {
        console.error("Failed to send user email:", error.message);
      }

      const admins = await userModel.find({ role: "admin" });
      const adminEmails = admins.map((admin) => admin.email);
      if (adminEmails.length > 0) {
        try {
          await sendConfirmationEmail({
            email: adminEmails,
            type: "confirmation",
            data: {
              ...emailData,
              locale,
              sendToAdmins: true,
            },
            sendToAdmins: true,
          });
        } catch (error) {
          console.error("Failed to send admin emails:", error.message);
        }
      } else {
        console.warn("No admin emails found for notification");
      }
    } catch (dbError) {
      console.error("Database error:", dbError.message);
      console.error("Full error:", dbError);
      return res.status(500).json({ error: "Database update failed" });
    }
  }

  res.json({ received: true });
});

export const stripeRefundPayment = catchAsyncError(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { bookingReference } = req.body;

  if (!bookingReference || typeof bookingReference !== "string") {
    return res.status(400).json({
      error: "Invalid booking reference provided",
    });
  }

  const booking = await subscriptionModel
    .findOne({
      bookingReference,
      userDetails: userId,
    })
    .select("+paymentIntentId")
    .populate("tourDetails", "title slug mainImg discountPercent")
    .populate("userDetails", "name email");

  if (!booking) {
    return res.status(404).json({
      error:
        "Booking not found or you don't have permission to refund this booking",
    });
  }

  if (booking.payment === "refunded") {
    return res.status(400).json({
      error: "This booking has already been refunded",
      bookingReference: booking.bookingReference,
    });
  }

  if (booking.payment === "pending") {
    return res.status(400).json({
      error:
        "Cannot refund a pending payment. Payment must be successful first.",
    });
  }

  if (booking.payment !== "success") {
    return res.status(400).json({
      error: `Cannot refund booking with payment status: ${booking.payment}`,
    });
  }

  if (!booking.paymentIntentId) {
    return res.status(400).json({
      error: "Failed to refund booking.",
    });
  }

  const bookingDateTime = new Date(`${booking.date} ${booking.time}`);
  const now = new Date();
  const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

  const REFUND_CUTOFF_HOURS = 24;

  if (hoursUntilBooking < REFUND_CUTOFF_HOURS && hoursUntilBooking > 0) {
    return res.status(400).json({
      error: `Refunds are not allowed within ${REFUND_CUTOFF_HOURS} hours of the booking time`,
      bookingTime: bookingDateTime.toISOString(),
      hoursRemaining: Math.round(hoursUntilBooking * 10) / 10,
    });
  }

  if (bookingDateTime < now) {
    return res.status(400).json({
      error: "Cannot refund a booking that has already occurred",
      bookingTime: bookingDateTime.toISOString(),
    });
  }

  try {
    const existingRefunds = await stripe.refunds.list({
      payment_intent: booking.paymentIntentId,
      limit: 1,
    });

    if (existingRefunds.data.length > 0) {
      if (booking.payment !== "refunded") {
        booking.payment = "refunded";
        await booking.save();
      }

      return res.status(400).json({
        error: "This payment has already been refunded",
        refundId: existingRefunds.data[0].id,
        refundedAt: existingRefunds.data[0].created,
      });
    }
  } catch (stripeError) {
    console.error("Stripe refund check error:", stripeError);
    return res.status(500).json({
      error: "Unable to verify refund status with payment provider",
      detail: stripeError.message,
    });
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(
      booking.paymentIntentId
    );

    if (!paymentIntent.id || !paymentIntent.id.startsWith("pi_")) {
      console.error("Invalid or missing payment intent ID:", paymentIntent.id);
      return res.status(400).json({ error: "Invalid payment intent ID" });
    }

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        error: `Cannot refund payment with status: ${paymentIntent.status}`,
      });
    }

    if (paymentIntent.amount <= 0) {
      return res.status(400).json({
        error: "Invalid payment amount for refund",
      });
    }
  } catch (stripeError) {
    console.error("Stripe payment intent retrieval error:", stripeError);
    return res.status(500).json({
      error: "Unable to retrieve payment information",
      detail: stripeError.message,
    });
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: booking.paymentIntentId,
      reason: "requested_by_customer",
      metadata: {
        bookingReference: booking.bookingReference,
        userId: userId.toString(),
        refundedAt: new Date().toISOString(),
      },
    });

    booking.payment = "refunded";
    await booking.save();

    if (booking.tourDetails) {
      const adults = booking.adultPricing?.adults || 0;
      const children = booking.childrenPricing?.children || 0;
      const optionsTotal =
        booking.options?.reduce((sum, opt) => {
          return sum + (opt.number || 0) + (opt.numberOfChildren || 0);
        }, 0) || 0;

      const totalTravelers = adults + children + optionsTotal;

      if (totalTravelers > 0) {
        await tourModel.findByIdAndUpdate(booking.tourDetails._id, {
          $inc: { totalTravelers: -totalTravelers },
        });
      }
    }

    const locale =
      req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "en";

    const emailData = {
      booking: booking,
      refundAmount: booking.totalPrice,
      refundId: refund.id,
      refundedAt: new Date(refund.created * 1000).toISOString(),
      user: booking.userDetails,
      locale: locale,
      currency: paymentIntent.currency?.toUpperCase() || "USD",
    };

    await sendConfirmationEmail({
      email: booking.userDetails.email,
      type: "refund",
      data: {
        ...emailData,
        sendToAdmins: false,
      },
    });

    const admins = await userModel.find({ role: "admin" });
    const adminEmails = admins.map((admin) => admin.email);
    if (adminEmails.length > 0) {
      try {
        await sendConfirmationEmail({
          email: adminEmails,
          type: "refund",
          data: {
            ...emailData,
            sendToAdmins: true,
          },
          sendToAdmins: true,
        });
      } catch (error) {
        console.error("Failed to send admin emails:", error.message);
      }
    } else {
      console.warn("No admin emails found for notification");
    }

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        refundedAt: new Date(refund.created * 1000).toISOString(),
      },
      booking: {
        reference: booking.bookingReference,
        tourTitle: booking.tourDetails?.title,
        originalAmount: booking.totalPrice,
      },
    });
  } catch (error) {
    console.error("Refund processing error:", error);

    if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({
        error: "Invalid refund request",
        detail: error.message,
      });
    }

    return res.status(500).json({
      error: "Refund processing failed. Please contact support.",
      detail:
        process.env.NODE_ENV === "development" ? error.message : undefined,
      reference: booking.bookingReference,
    });
  }
});
