import nodemailer from "nodemailer";
import { APP_EMAIL, APP_PASS } from "./config.js";
export function toMinutes(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}
export const transporterMain = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: APP_EMAIL,
    pass: APP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
