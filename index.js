import e from "express";
import adminRoutes from "./Routes/adminRoutes.js";
import mongoose from "mongoose";
import { db_url } from "./config.js";
import cookieParser from "cookie-parser";
import { userRoutes } from "./Routes/userRoutes.js";
import cors from "cors";

const app = e();

const allowedOrigin = "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(e.json());
app.use(cookieParser());
app.use("/admin", adminRoutes);
app.use("/users", userRoutes);

async function main() {
  try {
    await mongoose.connect(db_url);
    app.listen(3001, () => {
      console.log("listening...");
    });
  } catch (error) {
    console.log(error);
  }
}
main();
