import nodemailer from "nodemailer";
import verifyEmailHTML from "./verifyEmailTemplate.js";
import forgetPasswordHTML from "./ForgetPasswordTemplete.js";

let sendEmail = async (option) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, 
    auth: {
      user: "shehabwaleedd@gmail.com", 
      pass: "ctqm uwgp mqbw rgbz",
    },
  });

  // send mail with defined transport object
  const mailOptions = {
    from: "f365",
    to: `${option.email}`,
    subject: `${option.id ? "f365 Verify Email" : "f365 forget password"}`,

    html: `${
      option.id ? verifyEmailHTML(option.id) : forgetPasswordHTML(option.code)
    }`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email: " + error);
    } else {
      console.log("Email sent: " + option.email + info.response);
    }
  });
};
export default sendEmail;
