const verifyEmailHTML = (id) => {
const baseUrl = process.env.FRONT_END_URL || "http://localhost:3000";

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <title>Verify Your Email - Yalla Egipto</title>
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
        color: #ea0558;
      }
      img {
        height: auto;
        line-height: 100%;
        text-decoration: none;
        border: 0;
        outline: none;
      }
      .brand-accent {
        color: #ea0558;
      }
      </style>
    </head>
    <body style="background-color: #f8f9fa;">
    
      <!-- start preheader -->
      <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
        Verify your email to start exploring amazing tours and experiences in Egypt with Yalla Egipto!
      </div>
      <!-- end preheader -->
    
      <!-- start body -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
    
        <!-- start logo -->
        <tr>
          <td align="center" bgcolor="#f8f9fa">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
              <tr>
                <td align="center" valign="top" style="padding: 36px 24px;">
                  <div style="display: inline-block;">
                    <h2 style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #ea0558; text-decoration: none;">
                      🏺 Yalla Egipto
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
          <td align="center" bgcolor="#f8f9fa">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
              <tr>
                <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 4px solid #ea0558; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px; color: #2c3e50;">
                    Welcome to Your Egyptian Adventure! 🌅
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
          <td align="center" bgcolor="#f8f9fa">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
    
              <!-- start copy -->
              <tr>
                <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                  <p style="margin: 0; margin-bottom: 16px;">
                    <strong>Ahlan wa Sahlan!</strong> Welcome to Yalla Egipto, your gateway to unforgettable Egyptian experiences.
                  </p>
                  <p style="margin: 0; margin-bottom: 16px;">
                    You're just one click away from exploring the mystical pyramids, sailing the eternal Nile, and discovering hidden treasures of ancient Egypt. Click the button below to verify your email and start booking your dream tour!
                  </p>
                  <p style="margin: 0; color: #666; font-size: 14px;">
                    If you didn't create an account with <span class="brand-accent" style="color: #ea0558; font-weight: 600;">Yalla Egipto</span>, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <!-- end copy -->
    
              <!-- start button -->
              <tr>
                <td align="left" bgcolor="#ffffff">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                        <table border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" bgcolor="#ea0558" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(234, 5, 88, 0.3);">
                              <a href="${baseUrl}/auth/verify-email/${id}" target="_blank" style="display: inline-block; padding: 18px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                                ✨ Verify Email & Start Exploring
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
    
              <!-- start features -->
              <tr>
                <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;">
                  <div style="border-top: 1px solid #f1f1f1; padding-top: 20px; margin-top: 8px;">
                    <p style="margin: 0; margin-bottom: 12px; font-size: 14px; font-weight: 600; color: #ea0558;">
                      🎫 What awaits you:
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 20px;">
                      <li style="margin-bottom: 4px;">🏛️ Exclusive tours to the Pyramids of Giza & Sphinx</li>
                      <li style="margin-bottom: 4px;">🚢 Luxury Nile cruise experiences</li>
                      <li style="margin-bottom: 4px;">🏺 Archaeological site visits with expert guides</li>
                      <li style="margin-bottom: 4px;">🌆 Cairo, Alexandria & Luxor city tours</li>
                      <li>🏖️ Red Sea diving & beach getaways</li>
                    </ul>
                  </div>
                </td>
              </tr>
              <!-- end features -->
    
              <!-- start alternative link -->
              <tr>
                <td align="left" bgcolor="#ffffff" style="padding: 0 24px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; border-radius: 0 0 8px 8px;">
                  <div style="border-top: 1px solid #f1f1f1; padding-top: 16px;">
                    <p style="margin: 0; color: #666; font-size: 12px;">
                      Button not working? Copy and paste this link into your browser:<br>
                      <a href="${baseUrl}/user/verifyEmail/${id}" style="color: #ea0558; word-break: break-all;">${baseUrl}/user/verifyEmail/${id}</a>
                    </p>
                  </div>
                </td>
              </tr>
              <!-- end alternative link -->
    
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
          <td align="center" bgcolor="#f8f9fa" style="padding: 24px;">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
    
              <!-- start permission -->
              <tr>
                <td align="center" bgcolor="#f8f9fa" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                  <p style="margin: 0;">
                    You received this email because you created an account with Yalla Egipto. If you didn't request this verification, you can safely delete this email.
                  </p>
                </td>
              </tr>
              <!-- end permission -->
    
              <!-- start company info -->
              <tr>
                <td align="center" bgcolor="#f8f9fa" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                  <p style="margin: 0; margin-bottom: 8px;">
                    <strong style="color: #ea0558;">Yalla Egipto Tours & Travel</strong><br>
                    Your trusted partner for authentic Egyptian experiences
                  </p>
                  <p style="margin: 0; font-size: 12px;">
                    📍 Cairo, Egypt | 📧 info@yallaegipto.com | 📞 +20 xxx-xxx-xxxx
                  </p>
                </td>
              </tr>
              <!-- end company info -->
    
              <!-- start social links -->
              <tr>
                <td align="center" bgcolor="#f8f9fa" style="padding: 0 24px 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                  <p style="margin: 0; font-size: 12px;">
                    Follow us: 
                    <a href="#" style="color: #ea0558; text-decoration: none; margin: 0 4px;">Facebook</a> |
                    <a href="#" style="color: #ea0558; text-decoration: none; margin: 0 4px;">Instagram</a> |
                    <a href="#" style="color: #ea0558; text-decoration: none; margin: 0 4px;">WhatsApp</a>
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

export default verifyEmailHTML;
