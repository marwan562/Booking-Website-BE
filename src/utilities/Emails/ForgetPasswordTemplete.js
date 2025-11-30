const forgetPasswordHTML = (code) => {
  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <title>Reset Your Password - Yalla Egipto</title>
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
        color: #ff0066;
      }
      img {
        height: auto;
        line-height: 100%;
        text-decoration: none;
        border: 0;
        outline: none;
      }
      .brand-accent {
        color: #ff0066;
      }
      .reset-code {
        background: #ff0066;
        color: #ffffff;
        font-family: 'Courier New', monospace;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 4px;
        padding: 20px 32px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.10), 0 4px 6px -1px rgba(0, 0, 0, 0.10);
      }
      </style>
    </head>
    <body style="background-color: #ffffff;">

      <!-- start preheader -->
      <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
        Reset your Yalla Egipto password and get back to planning your Egyptian adventure!
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
                <td align="left" bgcolor="#faf9f5" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 4px solid #ff0066; border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 40px; color: #3d3929;">
                    Password Reset Request
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
                <td align="left" bgcolor="#faf9f5" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #3d3929;">
                  <p style="margin: 0; margin-bottom: 16px;">
                    <strong>Hello,</strong>
                  </p>
                  <p style="margin: 0; margin-bottom: 16px;">
                    We received a request to reset your password for your <span class="brand-accent" style="color: #ff0066; font-weight: 600;">Yalla Egipto</span> account. Use the verification code below to set a new password and get back to exploring Egypt's magnificent treasures.
                  </p>
                  <p style="margin: 0; margin-bottom: 16px; color: #83827d; font-size: 14px;">
                    This code will expire in <strong style="color: #3d3929;">15 minutes</strong> for your security.
                  </p>
                </td>
              </tr>
              <!-- end copy -->

              <!-- start reset code -->
              <tr>
                <td align="center" bgcolor="#faf9f5" style="padding: 12px 24px 24px;">
                  <div class="reset-code" style="background: #ff0066; color: #ffffff; font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; letter-spacing: 4px; padding: 20px 32px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.10), 0 4px 6px -1px rgba(0, 0, 0, 0.10); display: inline-block;">
                    ${code}
                  </div>
                  <p style="margin: 12px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #83827d; text-align: center;">
                    Copy this code and paste it in the password reset form
                  </p>
                </td>
              </tr>
              <!-- end reset code -->

              <!-- start security notice -->
              <tr>
                <td align="left" bgcolor="#faf9f5" style="padding: 0 24px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;">
                  <div style="background: #ffffff; border-left: 4px solid #c96442; padding: 16px 20px; border-radius: 8px; box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.05);">
                    <p style="margin: 0; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #3d3929;">
                      Security Notice
                    </p>
                    <p style="margin: 0; color: #535146; font-size: 14px; line-height: 20px;">
                      If you didn't request this password reset, someone else might be trying to access your account. Please contact our support team immediately at <a href="mailto:security@yallaegipto.com" style="color: #ff0066; font-weight: 600;">security@yallaegipto.com</a>
                    </p>
                  </div>
                </td>
              </tr>
              <!-- end security notice -->

              <!-- start tips -->
              <tr>
                <td align="left" bgcolor="#faf9f5" style="padding: 0 24px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-radius: 0 0 12px 12px;">
                  <div style="border-top: 1px solid #dad9d4; padding-top: 20px;">
                    <p style="margin: 0; margin-bottom: 12px; font-size: 14px; font-weight: 600; color: #3d3929;">
                      Password Tips:
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #535146; font-size: 14px; line-height: 24px;">
                      <li style="margin-bottom: 4px;">Use at least 8 characters with a mix of letters, numbers, and symbols</li>
                      <li style="margin-bottom: 4px;">Avoid using personal information like birthdays or names</li>
                      <li style="margin-bottom: 4px;">Don't reuse passwords from other accounts</li>
                      <li>Consider using a password manager for extra security</li>
                    </ul>
                  </div>
                </td>
              </tr>
              <!-- end tips -->

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
                <td align="center" bgcolor="#ffffff" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #83827d;">
                  <p style="margin: 0;">
                    You received this email because a password reset was requested for your Yalla Egipto account. If you didn't request this reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <!-- end permission -->

              <!-- start company info -->
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
              <!-- end company info -->

              <!-- start support -->
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
              <!-- end support -->

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

export default forgetPasswordHTML;
