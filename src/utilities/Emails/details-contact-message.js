export const contactDetailsHTML = (contact) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>New Contact Message - Yalla Egipto</title>
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

          <!-- Card -->
          <tr>
            <td style="background-color: #faf9f5; border: 1px solid #dad9d4; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">

                <!-- Header -->
                <tr>
                  <td style="padding: 24px 24px 0 24px;">
                    <h2 style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: #141413;">
                      New Contact Message
                    </h2>
                    <p style="margin: 8px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #535146;">
                      A new message has been submitted through the website.
                    </p>
                  </td>
                </tr>

                <!-- Contact Details -->
                <tr>
                  <td style="padding: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf9f5; border: 1px solid #dad9d4; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #83827d; width: 80px;">
                                Name
                              </td>
                              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #141413; font-weight: 600;">
                                ${contact.name}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #83827d;">
                                Email
                              </td>
                              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px;">
                                <a href="mailto:${contact.email}" style="color: #ff0066; text-decoration: none; font-weight: 600;">${contact.email}</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #83827d;">
                                Subject
                              </td>
                              <td style="padding: 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #141413;">
                                ${contact.subject}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="padding: 0 24px 24px 24px;">
                    <p style="margin: 0 0 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #83827d; text-transform: uppercase; letter-spacing: 0.5px;">
                      Message
                    </p>
                    <div style="background-color: #ede9de; border-radius: 8px; padding: 16px;">
                      <p style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; color: #141413; line-height: 1.6;">
                        ${contact.message}
                      </p>
                    </div>
                  </td>
                </tr>

                ${contact.attachedFiles && contact.attachedFiles.length > 0 ? `
                <!-- Attachments -->
                <tr>
                  <td style="padding: 0 24px 24px 24px;">
                    <p style="margin: 0 0 8px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 12px; color: #83827d; text-transform: uppercase; letter-spacing: 0.5px;">
                      Attachments
                    </p>
                    ${contact.attachedFiles.map(file => `
                    <img src="${file.url}" alt="${file.public_id}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 8px;" />
                    `).join('')}
                  </td>
                </tr>
                ` : ''}

                <!-- Button -->
                <tr>
                  <td align="center" style="padding: 0 24px 24px 24px;">
                    <a href="mailto:${contact.email}?subject=Re: ${contact.subject}" style="display: inline-block; background-color: #ff0066; color: #ffffff; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);">
                      Reply to Sender
                    </a>
                  </td>
                </tr>

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
                Cairo, Egypt
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
