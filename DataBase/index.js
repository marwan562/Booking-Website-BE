import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`MongoDB has been successfully connected.`);
  } catch (error) {
    console.error(`Error: ${error} `);
    process.exit(1);
  }
};

export default connectDB;
