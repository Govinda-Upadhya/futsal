import e from "express";
import adminRoutes from "./Routes/adminRoutes.js";
import mongoose from "mongoose";
import { db_url } from "./config.js";
import cookieParser from "cookie-parser";

const app = e();

app.use(e.json());
app.use(cookieParser());
app.use("/admin", adminRoutes);

async function main() {
  try {
    await mongoose.connect(db_url);
    app.listen(3000, () => {
      console.log("listening...");
    });
  } catch (error) {
    console.log(error);
  }
}
main();
