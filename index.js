import express from "express";
import DbConnection from "./DataBase/DbConnection.js";
import morgan from "morgan";
import customErrorHandler from "./middlewares/customErrorHandler.js";
import dotenv from "dotenv";
import init from "./src/index.router.js";
const app = express();

DbConnection;

dotenv.config();

app.use(morgan("combined"));
app.use(express.json());
init(app);

app.use(customErrorHandler);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
