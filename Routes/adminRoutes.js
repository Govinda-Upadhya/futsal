import { Router } from "express";
import {
  acceptBooking,
  adminSignIn,
  adminSignUp,
  changePassword,
  changePasswordLink,
  deleteBooking,
  getAdmin,
  getBooking,
  isLoggedIn,
  rejectBooking,
} from "../Controllers/admin/adminManage.js";
import { adminMiddleware } from "../authmiddleware.js";
import {
  createGround,
  deleteGround,
  updateGround,
  viewGround,
  viewGrounds,
} from "../Controllers/ground/groundManage.js";
const adminRoutes = Router();

adminRoutes.post("/changePassword/link/:id", changePassword);
adminRoutes.post("/changePassword", changePasswordLink);
adminRoutes.post("/signup", adminSignUp);

adminRoutes.post("/signin", adminSignIn);
adminRoutes.use(adminMiddleware);
adminRoutes.get("/loggedIn", isLoggedIn);
adminRoutes.get("/getAdmin", getAdmin);
adminRoutes.post("/createground", createGround);

adminRoutes.get("/seeGrounds", viewGrounds);
adminRoutes.get("/seeGround/:id", viewGround);
adminRoutes.delete("/deleteground/:id", deleteGround);
adminRoutes.put("/updateground/:id", updateGround);
adminRoutes.get("/bookings", getBooking);
adminRoutes.post("/bookings/acceptbooking", acceptBooking);
adminRoutes.delete("/bookings/delete/:id", deleteBooking);
adminRoutes.post("/bookings/rejectbooking", rejectBooking);

export default adminRoutes;
