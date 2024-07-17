import {Router} from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

// http:localhost:3000/api/v1/users/register

router.route("/register").post(registerUser) 

// router.route("/register").post((req, res, next) => {
//     console.log("POST /register route hit");
//     next();
// }, registerUser);

export default router;