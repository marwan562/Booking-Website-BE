export const refundDetailsHTML = (data) => {
  const {
    booking,
    refundAmount,
    refundId,
    refundedAt,
    user,
    sendToAdmins = false,
    locale = "en",
    currency = "USD",
  } = data;

  const BASE_URL = process.env.FRONT_END_URL || "http://localhost:3000";
  const LINK = sendToAdmins
    ? `${BASE_URL}/dashboard/bookings`
    : `${BASE_URL}/${locale}`;

  if (!booking) {
    return "<p>Refund details not available.</p>";
  }

  const formatPrice = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateStr, day) => {
    const date = new Date(dateStr);
    const time = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dateStr} (${day}, ${time})`;
  };

  const formatRefundDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formattedRefundAmount = formatPrice(refundAmount);
  const tour = booking.tourDetails;
  const imgSrc =
    tour?.mainImg?.url || "https://via.placeholder.com/300x200?text=No+Image";
  const formattedDate = formatDate(booking.date.slice(0, 10), booking.day);

  const greeting = sendToAdmins
    ? "Refund Processed"
    : `Hello, ${user?.name || "Customer"}`;

  const refundMessage = sendToAdmins
    ? "A booking refund has been processed successfully."
    : "Your refund has been processed successfully. The amount will be returned to your original payment method within 5-10 business days.";

  // Calculate pricing breakdown
  const basePricingDetails = [
    ...(booking.adultPricing?.adults > 0
      ? [
          `<tr>
            <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #535146;">
              ${booking.adultPricing.adults} Adult${
            booking.adultPricing.adults > 1 ? "s" : ""
          }
            </td>
            <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #3d3929; font-weight: 600; text-align: right;">
              ${formatPrice(booking.adultPricing.totalPrice)}
            </td>
          </tr>`,
        ]
      : []),
    ...(booking.childrenPricing?.children > 0
      ? [
          `<tr>
            <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #535146;">
              ${booking.childrenPricing.children} Child${
            booking.childrenPricing.children > 1 ? "ren" : ""
          }
            </td>
            <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #3d3929; font-weight: 600; text-align: right;">
              ${formatPrice(booking.childrenPricing.totalPrice)}
            </td>
          </tr>`,
        ]
      : []),
  ].join("");

  const optionsPricingDetails =
    booking.options && booking.options.length > 0
      ? booking.options
          .map((option) => {
            const optionRows = [
              `<tr>
              <td colspan="2" style="padding: 12px 0 4px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #3d3929; border-top: 1px solid #dad9d4;">
                ${option.name || "Additional Option"}
              </td>
            </tr>`,
              ...(option.number > 0
                ? [
                    `<tr>
                    <td style="padding: 4px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #535146;">
                      ${option.number} Adult${option.number > 1 ? "s" : ""}
                    </td>
                    <td style="padding: 4px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #3d3929; font-weight: 600; text-align: right;">
                      ${formatPrice(option.price * option.number)}
                    </td>
                  </tr>`,
                  ]
                : []),
              ...(option.numberOfChildren > 0
                ? [
                    `<tr>
                    <td style="padding: 4px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #535146;">
                      ${option.numberOfChildren} Child${
                      option.numberOfChildren > 1 ? "ren" : ""
                    }
                    </td>
                    <td style="padding: 4px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #3d3929; font-weight: 600; text-align: right;">
                      ${formatPrice(
                        option.childPrice * option.numberOfChildren
                      )}
                    </td>
                  </tr>`,
                  ]
                : []),
            ].join("");
            return optionRows;
          })
          .join("")
      : "";

  let discountHTML = "";
  if (!booking.coupon?.discountPercent && tour?.discountPercent > 0) {
    discountHTML = `
      <tr>
        <td colspan="2" style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #10b981; font-weight: 500;">
          Discount applied: ${tour.discountPercent}% off
        </td>
      </tr>
    `;
  }
  if (booking.coupon?.discountPercent > 0) {
    discountHTML = `
      <tr>
        <td colspan="2" style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #10b981; font-weight: 500;">
          Coupon <span style="font-weight: 700;">${booking.coupon.code}</span> applied: ${booking.coupon.discountPercent}% off
        </td>
      </tr>
    `;
  }

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>${
      sendToAdmins ? "Refund Processed" : "Refund Confirmation"
    } - Yalla Egipto</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
    @media screen {
      @font-face {
        font-family: 'Source Sans Pro';
        font-style: normal;
        font-weight: 400;
        src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
      }
      @font-face {
        font-family: 'Source Sans Pro';
        font-style: normal;
        font-weight: 700;
        src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
      }
    }
    body, table, td, a { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-rspace: 0pt; mso-table-lspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    a[x-apple-data-detectors] { font-family: inherit !important; font-size: inherit !important; font-weight: inherit !important; line-height: inherit !important; color: inherit !important; text-decoration: none !important; }
    div[style*="margin: 16px 0;"] { margin: 0 !important; }
    body { width: 100% !important; height: 100% !important; padding: 0 !important; margin: 0 !important; }
    table { border-collapse: collapse !important; }
    a { color: #ff0066; }
    img { height: auto; line-height: 100%; text-decoration: none; border: 0; outline: none; }
    .view-bookings-button {
      background: #ff0066;
      color: #ffffff;
      font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;
      font-size: 16px;
      font-weight: 700;
      padding: 16px 32px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.10), 0 4px 6px -1px rgba(0, 0, 0, 0.10);
      text-decoration: none;
      display: inline-block;
    }
    </style>
  </head>
  <body style="background-color: #ffffff;">

    <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
      Your refund has been processed - Yalla Egipto
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%">

      <!-- Logo -->
      <tr>
        <td align="center" bgcolor="#ffffff">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="center" valign="top" style="padding: 36px 24px;">
                <div style="display: inline-block;">
                  <h2 style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #3d3929; text-decoration: none;">
                    Yalla Egipto
                  </h2>
                  <p style="margin: 4px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #83827d; text-align: center;">
                    Discover Egypt's Ancient Wonders
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Hero -->
      <tr>
        <td align="center" bgcolor="#ffffff">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="left" bgcolor="#faf9f5" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 4px solid #c96442; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 40px; color: #3d3929;">
                  ${greeting}
                </h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Refund Message -->
      <tr>
        <td align="center" bgcolor="#ffffff">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="left" bgcolor="#faf9f5" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                <p style="margin: 0; margin-bottom: 16px; color: #535146;">
                  ${refundMessage}
                </p>
                <div style="background: #ffffff; border-left: 4px solid #c96442; padding: 16px 20px; border-radius: 8px; box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.05);">
                  <p style="margin: 0; font-size: 14px; color: #535146;">
                    <strong style="color: #3d3929;">Refund Amount:</strong>
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 700; color: #c96442;">
                    ${formattedRefundAmount}
                  </p>
                  <p style="margin: 12px 0 0 0; font-size: 12px; color: #83827d;">
                    <strong style="color: #3d3929;">Refund ID:</strong> ${refundId}
                  </p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #83827d;">
                    <strong style="color: #3d3929;">Processed on:</strong> ${formatRefundDate(
                      refundedAt
                    )}
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Booking Details -->
      <tr>
        <td align="center" bgcolor="#ffffff">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td bgcolor="#faf9f5" style="padding: 0 24px 24px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding: 0 0 24px 0;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #ffffff; border: 1px solid #dad9d4; border-radius: 12px;">
                        <tr>
                          <td style="padding: 20px;">
                            <!-- Booking Number -->
                            <div style="background: #ede9de; padding: 8px 12px; border-radius: 8px; margin-bottom: 16px;">
                              <span style="font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #83827d; font-weight: 600;">REFUNDED BOOKING</span>
                              <div style="font-family: 'Courier New', monospace; font-size: 14px; color: #3d3929; font-weight: 600; margin-top: 4px;">${
                                booking.bookingReference
                              }</div>
                            </div>

                            <!-- Tour Image -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td align="center" style="padding-bottom: 16px;">
                                  <img src="${imgSrc}" alt="${
    tour?.title[locale] || "Tour Image"
  }" style="width: 100%; max-width: 300px; height: auto; border-radius: 12px; display: block; opacity: 0.7;" />
                                </td>
                              </tr>
                            </table>

                            <!-- Tour Title -->
                            <h3 style="margin: 0 0 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #3d3929; text-align: center;">
                              ${tour?.title[locale] || "Tour Title"}
                            </h3>

                            <!-- Date & Time -->
                            <p style="margin: 0 0 16px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #83827d; text-align: center;">
                              ${formattedDate} • ${booking.time}
                            </p>

                            <!-- Pricing Details -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                              ${basePricingDetails}
                              ${optionsPricingDetails}
                              ${discountHTML}
                              <tr>
                                <td colspan="2" style="padding: 12px 0 0 0; border-top: 2px solid #c96442;">
                                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                      <td style="font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; color: #3d3929;">
                                        Refunded Amount
                                      </td>
                                      <td style="font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 700; color: #c96442; text-align: right;">
                                        ${formattedRefundAmount}
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${
        sendToAdmins
          ? `
      <!-- Admin Dashboard Button -->
      <tr>
        <td align="center" bgcolor="#ffffff">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="center" bgcolor="#faf9f5" style="padding: 0 24px 24px;">
                <a href="${LINK}" class="view-bookings-button" style="background: #ff0066; color: #ffffff; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; padding: 16px 32px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.10), 0 4px 6px -1px rgba(0, 0, 0, 0.10); text-decoration: none; display: inline-block;">
                  View in Dashboard
                </a>
                <p style="margin: 12px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #83827d; text-align: center;">
                  Manage this refund in the admin dashboard
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `
          : `<tr>
        <td align="center" bgcolor="#ffffff">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="center" bgcolor="#faf9f5" style="padding: 0 24px 24px;">
                <a href="${LINK}" class="view-bookings-button" style="background: #ff0066; color: #ffffff; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; padding: 16px 32px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.10), 0 4px 6px -1px rgba(0, 0, 0, 0.10); text-decoration: none; display: inline-block;">
                 Browse New Tours
                </a>
                <p style="margin: 12px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #83827d; text-align: center;">
                  View trending tours
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
      }

      <!-- Important Info -->
      <tr>
        <td align="center" bgcolor="#ffffff">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="left" bgcolor="#faf9f5" style="padding: 0 24px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-radius: 0 0 12px 12px;">
                <div style="background: #ffffff; border-left: 4px solid #c96442; padding: 16px 20px; border-radius: 8px; box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.05);">
                  <p style="margin: 0; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #3d3929;">
                    Refund Processing Information
                  </p>
                  <p style="margin: 0; color: #535146; font-size: 14px; line-height: 20px;">
                    ${
                      sendToAdmins
                        ? "The refund has been initiated in Stripe. Funds will be returned to the customer's original payment method within 5-10 business days."
                        : "Your refund has been processed and will appear in your original payment method within 5-10 business days, depending on your bank's processing time. If you have any questions, contact us at <a href='mailto:support@yallaegipto.com' style='color: #ff0066; font-weight: 600;'>support@yallaegipto.com</a>"
                    }
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" bgcolor="#ffffff" style="padding: 24px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="center" bgcolor="#ffffff" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #83827d;">
                <p style="margin: 0;">
                  You received this email because a refund was processed for your booking with Yalla Egipto.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#ffffff" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #83827d;">
                <p style="margin: 0; margin-bottom: 8px;">
                  <strong style="color: #3d3929;">Yalla Egipto Tours & Travel</strong><br>
                  Your trusted partner for authentic Egyptian experiences
                </p>
                <p style="margin: 0; font-size: 12px;">
                  Cairo, Egypt | info@yallaegipto.com | +20 xxx-xxx-xxxx
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#ffffff" style="padding: 0 24px 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #83827d;">
                <p style="margin: 0; font-size: 12px;">
                  Need help? Contact us:
                  <a href="mailto:support@yallaegipto.com" style="color: #ff0066; text-decoration: none; font-weight: 600; margin: 0 4px;">Email</a> |
                  <a href="#" style="color: #ff0066; text-decoration: none; font-weight: 600; margin: 0 4px;">WhatsApp</a> |
                  <a href="#" style="color: #ff0066; text-decoration: none; font-weight: 600; margin: 0 4px;">Live Chat</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>

  </body>
  </html>`;
};
