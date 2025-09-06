import e from "express";
import adminRoutes from "./Routes/adminRoutes.js";
import mongoose from "mongoose";
import { db_url } from "./config.js";
import cookieParser from "cookie-parser";
import { userRoutes } from "./Routes/userRoutes.js";
import cors from "cors";

const app = e();
export const base_delete_admin = `https://www.thanggo.com/api/photo/admin/delete`;
export const base_delete_user = `https://www.thanggo.com/api/photo/user/delete`;
export const allowedOrigin = ["https://www.thanggo.com", "https://thanggo.com"];

app.use(e.json({ limit: "10mb" }));
app.use(e.urlencoded({ limit: "10mb", extended: true }));

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(cookieParser());
app.use("/users", userRoutes);
app.use("/admin", adminRoutes);

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
