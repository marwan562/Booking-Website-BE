import { catchAsyncError } from "../../middlewares/catchAsyncError.js";
import contactModel from "../../models/contactModel.js";
import userModel from "../../models/userModel.js";
import { ApiFeature } from "../../utilities/AppFeature.js";
import sendEmail from "../../utilities/Emails/sendEmail.js";

export const createContact = catchAsyncError(async (req, res) => {
  const contact = await contactModel.create(req.body);
  const admins = await userModel.find({ role: "admin" });
  const adminEmails = admins.map((admin) => admin.email);
  if (adminEmails.length > 0) {
    try {
      await sendEmail({
        email: adminEmails,
        sendToAdmins:true,
        contactDetails: contact,
      });
    } catch (error) {
      console.error("Something went wrong please try again");
    }
  }

  return res.status(201).json({
    message: "Contact message sent successfully",
    contact,
  });
});

export const getAllContacts = catchAsyncError(async (req, res) => {
  const apiFeature = new ApiFeature(contactModel.find(), req.query)
    .paginate()
    .fields()
    .filter()
    .search()
    .sort()
    .lean();

  const result = await apiFeature.mongoseQuery;

  const totalCount = await apiFeature.getTotalCount();
  const paginationMeta = apiFeature.getPaginationMeta(totalCount);
  return res.status(200).json({
    message: "Success",
    data: { contacts: result, pagination: paginationMeta },
  });
});
