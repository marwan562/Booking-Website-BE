import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import { AppError } from "../../utilities/AppError.js";
import subscriptionModel from "../../models/subscriptionModel.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";
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
      const subscription = await subscriptionModel.findByIdAndUpdate(
        subscriptionId,
        { payment: "success" },
        { new: true }
      );

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
