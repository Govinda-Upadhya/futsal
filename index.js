import e from "express";
import adminRoutes from "./Routes/adminRoutes.js";
import mongoose from "mongoose";
import {
  ALLOWED_ORIGINS,
  BASE_DELETE_ADMIN,
  BASE_DELETE_USER,
  db_url,
  PORT,
} from "./config.js";
import cookieParser from "cookie-parser";
import { userRoutes } from "./Routes/userRoutes.js";
import cors from "cors";
import { superAdminRoutes } from "./Routes/superAdmin.js";

const app = e();

// ------------------------------------------------------
// 🔥 RAW BODY MIDDLEWARE: MUST BE THE 1ST MIDDLEWARE
// ------------------------------------------------------
app.use((req, res, next) => {
  let data = "";

  req.on("data", (chunk) => {
    data += chunk;
  });

  req.on("end", () => {
    req.rawBody = data;
    next();
  });
});

// ------------------------------------------------------
// Now all other middleware
// ------------------------------------------------------
app.use(e.json({ limit: "10mb" }));
app.use(e.urlencoded({ limit: "10mb", extended: true }));

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

app.use(cookieParser());

app.use("/users", userRoutes);
app.use("/admin", adminRoutes);
app.use("/superAdmin", superAdminRoutes);

async function main() {
  try {
    await mongoose.connect(db_url);

    app.listen(PORT, () => {
      console.log("listening...", PORT);
    });
  } catch (error) {
    console.log(error);
  }
}

main();
