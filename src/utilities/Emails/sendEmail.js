import nodemailer from "nodemailer";
import verifyEmailHTML from "./verifyEmailTemplate.js";
import forgetPasswordHTML from "./ForgetPasswordTemplete.js";
import { contactDetailsHTML } from "./details-contact-message.js";
import { AppError } from "../AppError.js";

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new AppError("Email configuration is missing", 500);
  }

  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.cairo-studio.com",
    port: process.env.NODE_ENV === "development" ? 587 : 465,
    secure: process.env.NODE_ENV !== "development",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendEmail = async (option) => {
  try {
    if (!option.email) {
      throw new AppError("Email recipient is required", 400);
    }

    const transporter = createTransporter();

    const mailOptions = option.sendToAdmins
      ? {
          from: {
            name: "Yalla Egipto",
            address: "shehab@cairo-studio.com",
          },
          replyTo: "support@cairo-studio.com",
          to: option.email,
          subject: "New Contact Message Received",
          html: contactDetailsHTML(option.contactDetails),
        }
      : {
          from: {
            name: "Yalla Egipto",
            address: "shehab@cairo-studio.com",
          },
          replyTo: "support@cairo-studio.com",
          to: option.email,
          subject: option.id ? "Verify Email" : "Reset Password",
          html: option.id
            ? verifyEmailHTML(option.id)
            : forgetPasswordHTML(option.code),
        };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new AppError("Failed to send email. Please try again later.", 500);
  }
};
export default sendEmail;
