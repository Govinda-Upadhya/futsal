import { Router } from "express";
import {
  acceptBooking,
  adminProfile,
  adminSignIn,
  adminSignUp,
  deleteBooking,
  getBooking,
  isLoggedIn,
  rejectBooking,
} from "../Controllers/admin/adminManage.js";
import { adminMiddleware } from "../authmiddleware.js";
import {
  createGround,
  deleteGround,
  groundPics,
  updateGround,
  viewGround,
  viewGrounds,
} from "../Controllers/ground/groundManage.js";
const adminRoutes = Router();

adminRoutes.post("/signup", adminSignUp);
adminRoutes.post("/getpresignedurl/signup", adminProfile);
adminRoutes.post("/signin", adminSignIn);
adminRoutes.use(adminMiddleware);
adminRoutes.get("/loggedIn", isLoggedIn);
adminRoutes.post("/createground", createGround);
adminRoutes.post("/createground/uploadpic", groundPics);
adminRoutes.get("/seeGrounds", viewGrounds);
adminRoutes.get("/seeGround/:id", viewGround);
adminRoutes.delete("/deleteground/:id", deleteGround);
adminRoutes.put("/updateground/:id", updateGround);
adminRoutes.get("/bookings", getBooking);
adminRoutes.post("/bookings/acceptbooking", acceptBooking);
adminRoutes.delete("/bookings/delete/:id", deleteBooking);
adminRoutes.post("/bookings/rejectbooking", rejectBooking);
export default adminRoutes;
