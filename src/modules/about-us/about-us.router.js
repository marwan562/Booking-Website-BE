import { Router } from "express";
import { getAboutUs } from "./about-us.controller.js";

const aboutUsRouter = Router();

aboutUsRouter.route("/").get(getAboutUs);

export default aboutUsRouter;
