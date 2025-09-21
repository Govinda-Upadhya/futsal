import "dotenv/config";
export const db_url = process.env.MONGODB;
export const JWT_SECRET = process.env.JWT_SECRET;
export const APP_PASS = process.env.APP_PASS;
export const APP_EMAIL = process.env.EMAIL;
export const JWT_SUPER = process.env.JWT_ADMIN;
