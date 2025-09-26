const bookingConfirmationHTML = (bookingData) => {
  const baseUrl = process.env.FRONT_END_URL || "http://localhost:3000";

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <title>Booking Confirmed - Yalla Egipto</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style type="text/css">
      /**
       * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
       */
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
      /**
       * Avoid browser level font resizing.
       * 1. Windows Mobile
       * 2. iOS / OSX
       */
      body,
      table,
      td,
      a {
        -ms-text-size-adjust: 100%; /* 1 */
        -webkit-text-size-adjust: 100%; /* 2 */
      }
      /**
       * Remove extra space added to tables and cells in Outlook.
       */
      table,
      td {
        mso-table-rspace: 0pt;
        mso-table-lspace: 0pt;
      }
      /**
       * Better fluid images in Internet Explorer.
       */
      img {
        -ms-interpolation-mode: bicubic;
      }
      /**
       * Remove blue links for iOS devices.
       */
      a[x-apple-data-detectors] {
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        color: inherit !important;
        text-decoration: none !important;
      }
      /**
       * Fix centering issues in Android 4.4.
       */
      div[style*="margin: 16px 0;"] {
        margin: 0 !important;
      }
      body {
        width: 100% !important;
        height: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      /**
       * Collapse table borders to avoid space between cells.
       */
      table {
        border-collapse: collapse !important;
      }
      a {
        color: #333333;
      }
      img {
        height: auto;
        line-height: 100%;
        text-decoration: none;
        border: 0;
        outline: none;
      }
      .brand-accent {
        color: #333333;
      }
      </style>
    </head>
    <body style="background-color: #ffffff;">
    
      <!-- start preheader -->
      <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
        Your booking with Yalla Egipto has been confirmed! Get ready for an unforgettable Egyptian adventure.
      </div>
      <!-- end preheader -->
    
      <!-- start body -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
    
        <!-- start logo -->
        <tr>
          <td align="center" bgcolor="#ffffff">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
              <tr>
                <td align="center" valign="top" style="padding: 36px 24px;">
                  <div style="display: inline-block;">
                    <h2 style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #333333; text-decoration: none;">
                      Yalla Egipto
                    </h2>
                    <p style="margin: 4px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #666; text-align: center;">
                      Discover Egypt's Ancient Wonders
                    </p>
                  </div>
                </td>
              </tr>
            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
          </td>
        </tr>
        <!-- end logo -->
    
        <!-- start hero -->
        <tr>
          <td align="center" bgcolor="#ffffff">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
              <tr>
                <td align="left" bgcolor="#f8f9fa" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 4px solid #333333; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px; color: #2c3e50;">
                    Booking Confirmed!
                  </h1>
                </td>
              </tr>
            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
          </td>
        </tr>
        <!-- end hero -->
    
        <!-- start copy block -->
        <tr>
          <td align="center" bgcolor="#ffffff">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
    
              <!-- start copy -->
              <tr>
                <td align="left" bgcolor="#f8f9fa" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                  <p style="margin: 0; margin-bottom: 16px;">
                    <strong>Dear ${bookingData.customerName || '[Customer Name]'},</strong>
                  </p>
                  <p style="margin: 0; margin-bottom: 16px;">
                    Thank you for choosing Yalla Egipto! Your booking has been successfully confirmed and we're excited to provide you with an unforgettable Egyptian experience.
                  </p>
                  <p style="margin: 0; margin-bottom: 16px;">
                    Please find your booking details below and keep this email for your records.
                  </p>
                </td>
              </tr>
              <!-- end copy -->
    
              <!-- start booking details -->
              <tr>
                <td align="left" bgcolor="#f8f9fa" style="padding: 0 24px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;">
                  <div style="background-color: #ffffff; border: 2px solid #e9ecef; border-radius: 8px; padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #2c3e50;">
                      Booking Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #555; width: 40%;">
                          Booking Reference:
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; color: #333;">
                          ${bookingData.bookingRef || '[BOOKING-REF]'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #555;">
                          Tour Name:
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; color: #333;">
                          ${bookingData.tourName || '[Tour Name]'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #555;">
                          Tour Date:
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; color: #333;">
                          ${bookingData.tourDate || '[Tour Date]'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #555;">
                          Number of Guests:
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; color: #333;">
                          ${bookingData.guestCount || '[Guest Count]'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #555;">
                          Total Amount:
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; color: #333; font-weight: 700;">
                          ${bookingData.totalAmount || '[Total Amount]'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #555;">
                          Payment Status:
                        </td>
                        <td style="padding: 8px 0; color: #28a745; font-weight: 700;">
                          ${bookingData.paymentStatus || 'Confirmed'}
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              <!-- end booking details -->
    
              <!-- start button -->
              <tr>
                <td align="left" bgcolor="#f8f9fa">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" bgcolor="#f8f9fa" style="padding: 12px;">
                        <table border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" bgcolor="#333333" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                              <a href="${baseUrl}/bookings/${bookingData.bookingId || 'booking-id'}" target="_blank" style="display: inline-block; padding: 18px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                                View Full Booking Details
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- end button -->
    
              <!-- start next steps -->
              <tr>
                <td align="left" bgcolor="#f8f9fa" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;">
                  <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 8px;">
                    <p style="margin: 0; margin-bottom: 12px; font-size: 16px; font-weight: 600; color: #333333;">
                      What happens next:
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 22px;">
                      <li style="margin-bottom: 8px;">Our team will contact you 24-48 hours before your tour with final details</li>
                      <li style="margin-bottom: 8px;">You will receive pickup location and time confirmation</li>
                      <li style="margin-bottom: 8px;">Please have your booking reference ready on the day of travel</li>
                      <li style="margin-bottom: 8px;">Bring a valid ID or passport for verification</li>
                      <li>Check our website for weather updates and recommended clothing</li>
                    </ul>
                  </div>
                </td>
              </tr>
              <!-- end next steps -->
    
              <!-- start contact info -->
              <tr>
                <td align="left" bgcolor="#f8f9fa" style="padding: 0 24px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; border-radius: 0 0 8px 8px;">
                  <div style="border-top: 1px solid #e9ecef; padding-top: 16px;">
                    <p style="margin: 0; margin-bottom: 12px; color: #333; font-weight: 600;">
                      Need assistance or have questions?
                    </p>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      Contact our customer service team at info@yallaegipto.com or call +20 xxx-xxx-xxxx
                    </p>
                  </div>
                </td>
              </tr>
              <!-- end contact info -->
    
            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
          </td>
        </tr>
        <!-- end copy block -->
    
        <!-- start footer -->
        <tr>
          <td align="center" bgcolor="#ffffff" style="padding: 24px;">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
    
              <!-- start permission -->
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                  <p style="margin: 0;">
                    You received this email because you made a booking with Yalla Egipto. This is a transactional email to confirm your reservation.
                  </p>
                </td>
              </tr>
              <!-- end permission -->
    
              <!-- start company info -->
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                  <p style="margin: 0; margin-bottom: 8px;">
                    <strong style="color: #333333;">Yalla Egipto Tours & Travel</strong><br>
                    Your trusted partner for authentic Egyptian experiences
                  </p>
                  <p style="margin: 0; font-size: 12px;">
                    Cairo, Egypt | info@yallaegipto.com | +20 xxx-xxx-xxxx
                  </p>
                </td>
              </tr>
              <!-- end company info -->
    
              <!-- start social links -->
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding: 0 24px 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                  <p style="margin: 0; font-size: 12px;">
                    Follow us: 
                    <a href="#" style="color: #333333; text-decoration: none; margin: 0 4px;">Facebook</a> |
                    <a href="#" style="color: #333333; text-decoration: none; margin: 0 4px;">Instagram</a> |
                    <a href="#" style="color: #333333; text-decoration: none; margin: 0 4px;">WhatsApp</a>
                  </p>
                </td>
              </tr>
              <!-- end social links -->
    
            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
          </td>
        </tr>
        <!-- end footer -->
    
      </table>
      <!-- end body -->
    
    </body>
    </html>`;
};

export default bookingConfirmationHTML;