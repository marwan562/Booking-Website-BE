import nodemailer from "nodemailer";
import verifyEmailHTML from "./verifyEmailTemplate.js";
import forgetPasswordHTML from "./ForgetPasswordTemplete.js";
import { contactDetailsHTML } from "./details-contact-message.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: process.env.NODE_ENV === "development" ? 587 : 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

let sendEmail = async (option) => {
  // send mail with defined transport object
  const mailOptions = {
    from: '"Yalla Egipto" <noreply@yallaegipto.com>',
    to: `${option.email}`,
    subject: `${option.id ? "Verify Email" : "forget password"}`,

    html: `${
      option.id ? verifyEmailHTML(option.id) : forgetPasswordHTML(option.code)
    }`,
  };

  const mailOptionsContact = {
    from: '"Yalla Egipto" <noreply@yallaegipto.com>',
    to: `${option.email}`,
    subject: "New Contact Message Received",
    html: contactDetailsHTML(option.contactDetails),
  };

  transporter.sendMail(
    option.sendToAdmins ? mailOptionsContact : mailOptions,
    (error, info) => {
      if (error) {
        console.error("Error sending email: " + error);
      } else {
        console.log("Email sent: " + option.email + info.response);
      }
    }
  );
};
export default sendEmail;
