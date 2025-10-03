import { Resend } from "resend";
import { AppError } from "../AppError.js";
import "dotenv/config";
import { confirmationDetailsHTML } from "./confirmation-details-html.js";
import { refundDetailsHTML } from "./refund-details-html.js";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendConfirmationEmail = async (option) => {
  try {
    const { email, type, data, sendToAdmins = false } = option;

    if (!email) {
      throw new AppError("Email recipient is required", 400);
    }

    const from = "hello@yallaegipto.com";
    const to = email;

    let subject = "";
    let html = "";

    switch (type) {
      case "confirmation":
        subject = sendToAdmins 
          ? "New Booking Payment Received" 
          : "Your Booking Confirmation";
        html = confirmationDetailsHTML(data);
        break;

      case "refund":
        subject = sendToAdmins 
          ? "Refund Payment Received" 
          : "Your Refund Has Been Processed";
        html = refundDetailsHTML(data);
        break;

      default:
        throw new AppError("Invalid email type specified", 400);
    }

    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", response.id);
    return response;

  } catch (error) {
    console.error("Failed to send email:", error);
    throw new AppError("Failed to send email. Please try again later.", 500);
  }
};

export default sendConfirmationEmail;
