import { Router } from "express";
import { fetchGrounds } from "../Controllers/user/userManage.js";

export const userRoutes = Router();

userRoutes.get("/getgrounds", fetchGrounds);
