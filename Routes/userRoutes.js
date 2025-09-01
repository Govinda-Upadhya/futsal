import { Router } from "express";
import {
  acceptChallenge,
  bookGround,
  bookinginfo,
  contactUs,
  createChallenge,
  fetchGrounds,
  getTimeBooked,
  mailer,
  seeDate,
  sendChallenge,
  viewGrounduser,
} from "../Controllers/user/userManage.js";
import { viewGrounds } from "../Controllers/ground/groundManage.js";

export const userRoutes = Router();

userRoutes.get("/getgrounds", fetchGrounds);
userRoutes.get("/seegrounds/:id", viewGrounduser);
userRoutes.post("/bookground/:id", bookGround);
userRoutes.get("/bookinginfo/:id", bookinginfo);
userRoutes.post("/bookinginfo/send_screentshot/", mailer);
userRoutes.get("/bookedTime", getTimeBooked);
userRoutes.post("/createChallenge", createChallenge);
userRoutes.get("/getChallenge", sendChallenge);
userRoutes.post("/acceptChallenge", acceptChallenge);
userRoutes.post("/searchDate", seeDate);
userRoutes.post("/contactus", contactUs);
