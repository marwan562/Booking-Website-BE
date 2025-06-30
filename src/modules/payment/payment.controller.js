import stripe from "stripe";
import { catchAsyncError } from "../../../middlewares/catchAsyncError.js";
import { AppError } from "../../../utilities/AppError.js";
import subscriptionModel from "../../../DataBase/models/subscriptionModel.js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import "dotenv/config";

import axios from "axios";

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

export const sessionCheckout = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { _id } = req.user;
  let subscription = await subscriptionModel.findOne({
    _id: id,
    userDetails: _id,
  });

  if (subscription.payment == "success") {
    return next(new AppError("The subscription has been paid"));
  }
  if (subscription) {
    let { options, adultPricing, childrenPricing } = subscription;
    let line_items = [];
    line_items.push({
      price_data: {
        currency: "USD",
        unit_amount: adultPricing.price * 100,
        product_data: {
          name: `Adult`,
          images: ["https://cdn-icons-png.freepik.com/512/3787/3787951.png"],
        },
      },
      quantity: adultPricing.adults,
    });
    if (childrenPricing.totalPrice > 0) {
      line_items.push({
        price_data: {
          currency: "USD",
          unit_amount: childrenPricing.price * 100,
          product_data: {
            name: "Child",
            images: [
              "https://toppng.com/uploads/preview/children-icon-png-11552333579xtroc64zmd.png",
            ],
          },
        },
        quantity: childrenPricing.children,
      });
    }
    if (options) {
      options.forEach((option) => {
        line_items.push({
          price_data: {
            currency: "USD",
            unit_amount: option.totalPrice * 100,
            product_data: {
              name: option.name,
              images: [
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjIieaF9GiSBIqCSzhrBCyzLELknPW4SLziBBZ5yXuAw&s",
              ],
            },
          },
          quantity: 1,
        });
      });
    }
    const token = jwt.sign(
      { subscriptionId: req.params.id },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    let stripeSession = await stripeInstance.checkout.sessions.create({
      line_items,

      metadata: {
        subscriptionId: req.params.id,
      },
      mode: "payment",
      customer_email: req.user.email,
      success_url: `https://tours-b5zy.onrender.com/payment/handelPassCheckout/${token}`,
      cancel_url: "https://www.yahoo.com/?guccounter=1",
    });

    if (!stripeSession)
      return next(new AppError("Payment Failed, please try again!", 500));

    res.json({ redirectTo: stripeSession.url, data: subscription });
  } else {
    next(new AppError("can't find the subscription"));
  }
});

export const handleFaildPayment = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  jwt.verify(token, process.env.JWT_SECRET, async function (err, decoded) {
    if (err) return next(new AppError(err.message));

    const { subscriptionId } = decoded;
    const subscription = await subscriptionModel.findById(subscriptionId);

    res.redirect(
      `https://pyramidsegypttour.com/account/user/${subscription.userDetails._id}/${subscriptionId}/orderFailed`
    );
  });
});
export const handlePendingPayment = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  jwt.verify(token, process.env.JWT_SECRET, async function (err, decoded) {
    if (err) return next(new AppError(err.message));

    const { subscriptionId } = decoded;
    const subscription = await subscriptionModel.findById(subscriptionId);

    res.redirect(
      `https://pyramidsegypttour.com/account/user/${subscription.userDetails._id}/${subscriptionId}/orderPending`
    );
  });
});
export const handleSuccessPayment = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  jwt.verify(token, process.env.JWT_SECRET, async function (err, decoded) {
    if (err) return next(new AppError(err.message));

    const { subscriptionId } = decoded;
    const subscription = await subscriptionModel.findByIdAndUpdate(
      subscriptionId,
      { payment: "success" },
      { new: true }
    );

    res.redirect(
      `https://pyramidsegypttour.com/account/user/${subscription.userDetails._id}/${subscriptionId}/orderConfirmed`
    );
  });
});

export const fwaterk = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { currency } = req.body;
  const { _id: userId } = req.user;
  const response = await fetch(
    "https://api.exchangerate-api.com/v4/latest/USD"
  );
  const data = await response.json();
  const EGP = data.rates.EGP;
  const EUR = data.rates.EUR;
  let subscription = await subscriptionModel.findOne({
    _id: id,
    userDetails: userId,
  });
  if (subscription.payment == "success") {
    return next(new AppError("The subscription has been paid"));
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
    const first_name = subscription.userDetails.name.split(" ")[0];
    const last_name = subscription.userDetails.name.split(" ")[1];
    const customer = {
      first_name,
      last_name,
      email: subscription.userDetails.email,
      phone: subscription.userDetails.phone,
    };
    const token = jwt.sign(
      { subscriptionId: req.params.id },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
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

function createInvoiceLink(
  cartItems,
  customer,
  cartTotal,
  token,
  currency = "USD"
) {
  var data = JSON.stringify({
    payment_method_id: 2,
    cartTotal,
    currency,
    customer,
    redirectionUrls: {
      successUrl: `https://pyramidsegypttour.com/api/payment/handelPassCheckout/${token}`,
      failUrl: `https://pyramidsegypttour.com/api/payment/handelFaildPass/${token}`,
      pendingUrl: `https://pyramidsegypttour.com/api/payment/handelPendingPass/${token}`,
    },
    cartItems,
    sendEmail: true,
  });

  var config = {
    method: "post",
    url: "https://app.fawaterk.com/api/v2/invoiceInitPay",
    headers: {
      Authorization: `Bearer ${process.env.API_TOKEN_FWATERK}`,
      "Content-Type": "application/json",
    },
    data: data,
  };

  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios(config);
      resolve(response.data);
    } catch (error) {
      reject(error.response.data.message);
    }
  });
}

//=============================================================
//=============================================================

const environment = process.env.ENVIRONMENT || "sandbox";
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const endpoint_url =
  environment === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

function get_access_token() {
  const auth = `${client_id}:${client_secret}`;
  const data = "grant_type=client_credentials";
  return fetch(endpoint_url + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
    },
    body: data,
  })
    .then((res) => res.json())
    .then((json) => {
      return json.access_token;
    });
}
export const createOrderPaypal = (req, res) => {
  get_access_token()
    .then((access_token) => {
      let order_data_json = {
        intent: req.body.intent.toUpperCase(),
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "1.00",
            },
          },
        ],
      };
      const data = JSON.stringify(order_data_json);

      fetch(endpoint_url + "/v2/checkout/orders", {
        //https://developer.paypal.com/docs/api/orders/v2/#orders_create
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: data,
      })
        .then((res) => res.json())
        .then((json) => {
          res.send(json);
        }); //Send minimal data to client
    })
    .catch((err) => {
      res.status(500).send(err);
    });
};

export const completeOrder = (req, res) => {
  get_access_token()
    .then((access_token) => {
      fetch(
        endpoint_url +
          "/v2/checkout/orders/" +
          req.body.order_id +
          "/" +
          req.body.intent,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
        .then((res) => res.json())
        .then((json) => {
          res.send(json);
        }); //Send minimal data to client
    })
    .catch((err) => {
      res.status(500).send(err);
    });
};
