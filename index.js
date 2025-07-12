import express from "express";
import morgan from "morgan";
import cors from "cors"
import customErrorHandler from "./middlewares/customErrorHandler.js";
import dotenv from "dotenv";
import dbConnection from "./DataBase/DbConnection.js";
import router from "./src/index.router.js";
dotenv.config();

const app = express();
dbConnection();

app.use(cors({
  origin:process.env.FRONT_END_URL
}))
app.use(morgan("combined"));
app.use(express.json());
app.use("/api", router);

app.all("*", (req, _, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(customErrorHandler);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
