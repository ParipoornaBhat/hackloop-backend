const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(`${MONGODB_URI}`, {
    // Remove the deprecated options
  })
  .then(() => console.log("Connected to database"))
  .catch((err) => console.error("Database connection error:", err));
//aa
