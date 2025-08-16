import { Router } from "express";
import {
  adminProfile,
  adminSignIn,
  adminSignUp,
  isLoggedIn,
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

export default adminRoutes;
