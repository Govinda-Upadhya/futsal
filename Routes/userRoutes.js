import { Router } from "express";
import {
  bookGround,
  bookinginfo,
  fetchGrounds,
  getTimeBooked,
  mailer,
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
