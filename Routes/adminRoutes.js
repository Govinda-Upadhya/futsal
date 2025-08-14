import { Router } from "express";
import { adminSignIn, adminSignUp } from "../Controllers/admin/adminManage.js";
import { adminMiddleware } from "../authmiddleware.js";
import {
  createGround,
  deleteGround,
  updateGround,
  viewGround,
  viewGrounds,
} from "../Controllers/ground/groundManage.js";
const adminRoutes = Router();

adminRoutes.post("/signup", adminSignUp);
adminRoutes.post("/signin", adminSignIn);
adminRoutes.use(adminMiddleware);
adminRoutes.post("/createground", createGround);
adminRoutes.get("/seeGrounds", viewGrounds);
adminRoutes.get("/seeGround/:id", viewGround);
adminRoutes.post("/deleteground/:id", deleteGround);
adminRoutes.post("/updateground/:id", updateGround);

export default adminRoutes;
