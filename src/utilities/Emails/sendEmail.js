import { Resend } from "resend";
import verifyEmailHTML from "./verifyEmailTemplate.js";
import forgetPasswordHTML from "./ForgetPasswordTemplete.js";
import { contactDetailsHTML } from "./details-contact-message.js";
import { AppError } from "../AppError.js";
import "dotenv/config";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (option) => {
  try {
    if (!option.email) {
      throw new AppError("Email recipient is required", 400);
    }
    const from = "hello@yallaegipto.com";
    const to = option.email;

    let subject;
    let html;

    if (option.sendToAdmins) {
      subject = "New Contact Message Received";
      html = contactDetailsHTML(option.contactDetails);
    } else if (option.id) {
      subject = "Verify Email";
      html = verifyEmailHTML(option.id);
    } else if (option.code) {
      subject = "Reset Password";
      html = forgetPasswordHTML(option.code);
    } else {
      throw new AppError("Missing required email parameters (id or code)", 400);
    }

    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return response;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new AppError("Failed to send email. Please try again later.", 500);
  }
};

export default sendEmail;