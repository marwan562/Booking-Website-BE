export const confirmationDetailsHTML = (data) => {
  const {
    bookings,
    totalAmount,
    user,
    sendToAdmins = false,
    locale,
    currency = "USD",
  } = data;

  const BASE_URL = process.env.FRONT_END_URL || "http://localhost:3000";
  const LINK = sendToAdmins
    ? `${BASE_URL}/dashboard/bookings`
    : `${BASE_URL}/${locale}/user/bookings#past-bookings`;

  if (!bookings || bookings.length === 0) {
    return "<p>Booking details not available.</p>";
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

  const formattedTotal = formatPrice(totalAmount);
  const greeting = sendToAdmins ? "New Booking Received" : `Hi ${user?.name || "there"}!`;
  const successMessage = sendToAdmins
    ? "A new booking has been paid successfully."
    : "Your booking is confirmed. Here are your details:";

  const bookingItemsHTML = bookings
    .map((booking, index) => {
      const tour = booking.tourDetails;
      const imgSrc = tour?.mainImg?.url || "https://via.placeholder.com/300x200?text=No+Image";
      const formattedDate = formatDate(booking.date.slice(0, 10), booking.day);

      const pricingRows = [
        ...(booking.adultPricing?.adults > 0
          ? [`<tr>
              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #535146;">
                ${booking.adultPricing.adults} Adult${booking.adultPricing.adults > 1 ? "s" : ""}
              </td>
              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #141413; font-weight: 600; text-align: right;">
                ${formatPrice(booking.adultPricing.totalPrice)}
              </td>
            </tr>`]
          : []),
        ...(booking.childrenPricing?.children > 0
          ? [`<tr>
              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #535146;">
                ${booking.childrenPricing.children} Child${booking.childrenPricing.children > 1 ? "ren" : ""}
              </td>
              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #141413; font-weight: 600; text-align: right;">
                ${formatPrice(booking.childrenPricing.totalPrice)}
              </td>
            </tr>`]
          : []),
      ].join("");

      const optionsHTML = booking.options && booking.options.length > 0
        ? booking.options.map((option) => `
            <tr>
              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #535146;">
                ${option.name || "Option"}${option.number > 0 ? ` (${option.number})` : ""}
              </td>
              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #141413; font-weight: 600; text-align: right;">
                ${formatPrice((option.price * (option.number || 0)) + (option.childPrice * (option.numberOfChildren || 0)))}
              </td>
            </tr>
          `).join("")
        : "";

      let discountHTML = "";
      if (booking.coupon?.discountPercent > 0) {
        discountHTML = `<tr>
          <td colspan="2" style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #10b981;">
            Coupon ${booking.coupon.code}: ${booking.coupon.discountPercent}% off
          </td>
        </tr>`;
      } else if (tour?.discountPercent > 0) {
        discountHTML = `<tr>
          <td colspan="2" style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #10b981;">
            ${tour.discountPercent}% discount applied
          </td>
        </tr>`;
      }

      return `
        <!-- Booking Card -->
        <tr>
          <td style="padding: 0 0 16px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf9f5; border: 1px solid #dad9d4; border-radius: 12px;">
              <tr>
                <td style="padding: 20px;">
                  <!-- Reference -->
                  <p style="margin: 0 0 12px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #83827d; text-transform: uppercase; letter-spacing: 0.5px;">
                    Booking #${index + 1} · ${booking.bookingReference}
                  </p>

                  <!-- Tour Image -->
                  <img src="${imgSrc}" alt="${tour?.title[locale] || "Tour"}" style="width: 100%; max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;" />

                  <!-- Tour Title -->
                  <h3 style="margin: 0 0 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 700; color: #141413;">
                    ${tour?.title[locale] || "Tour"}
                  </h3>

                  <!-- Date -->
                  <p style="margin: 0 0 16px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #83827d;">
                    ${formattedDate} · ${booking.time}
                  </p>

                  <!-- Pricing -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #dad9d4; margin-top: 8px;">
                    ${pricingRows}
                    ${optionsHTML}
                    ${discountHTML}
                    <tr>
                      <td style="padding: 12px 0 0 0; border-top: 1px solid #dad9d4; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; color: #141413;">
                        Total
                      </td>
                      <td style="padding: 12px 0 0 0; border-top: 1px solid #dad9d4; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ff0066; text-align: right;">
                        ${formatPrice(booking.totalPrice)}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>${sendToAdmins ? "New Booking" : "Booking Confirmed"} - Yalla Egipto</title>
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
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a { color: #ff0066; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  </style>
</head>
<body style="background-color: #faf9f5; margin: 0 !important; padding: 40px 0 !important;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 0 24px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <h1 style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #3d3929;">
                Yalla Egipto
              </h1>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #faf9f5; border: 1px solid #dad9d4; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">

                <!-- Header -->
                <tr>
                  <td style="padding: 24px 24px 0 24px;">
                    <h2 style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: #141413;">
                      ${greeting}
                    </h2>
                    <p style="margin: 8px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #535146;">
                      ${successMessage}
                    </p>
                  </td>
                </tr>

                <!-- Total Amount -->
                <tr>
                  <td style="padding: 24px;">
                    <div style="background-color: #ede9de; border-radius: 8px; padding: 16px; text-align: center;">
                      <p style="margin: 0 0 4px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #83827d;">
                        Total Paid
                      </p>
                      <p style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 32px; font-weight: 700; color: #141413;">
                        ${formattedTotal}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Bookings -->
                <tr>
                  <td style="padding: 0 24px 24px 24px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      ${bookingItemsHTML}
                    </table>
                  </td>
                </tr>

                ${!sendToAdmins ? `
                <!-- Button -->
                <tr>
                  <td align="center" style="padding: 0 24px 24px 24px;">
                    <a href="${LINK}" style="display: inline-block; background-color: #ff0066; color: #ffffff; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);">
                      View My Bookings
                    </a>
                  </td>
                </tr>
                ` : ""}

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 0 0 0;">
              <p style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #83827d;">
                Yalla Egipto Tours & Travel
              </p>
              <p style="margin: 8px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #83827d;">
                Questions? Contact support@yallaegipto.com
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
