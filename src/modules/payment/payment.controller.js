import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import subscriptionModel from "../../models/subscriptionModel.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";
import tourModel from "../../models/tourModel.js";
import Stripe from "stripe";

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

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    const userId = paymentIntent.metadata.userId;
    const bookingRefsString = paymentIntent.metadata.bookingRefs;

    if (!bookingRefsString) {
      console.error("No bookingRefs found in payment intent metadata");
      return res.status(400).json({ error: "No bookingRefs found" });
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
        return res.json({
          received: true,
          message: "No matching subscriptions found",
        });
      }

      await Promise.all(
        subscriptions.map((subscription) => {
          subscription.payment = "success";
          return subscription.save();
        })
      );
    } catch (dbError) {
      return res.status(500).json({ error: "Database update failed" });
    }
  }

  res.json({ received: true });
});

