import {Router} from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// http:localhost:3000/api/v1/users/register

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount: 1
        },
        {
            name:"coverImage", 
            maxCount: 1
        }
    ]),
    registerUser
) 

// login ka variafication kaise --> auth middleware se
router.route("/login").post(loginUser)


// secured routes

router.route("/logout").post(
    verifyJWT,
    logoutUser
);


router.route("/refresh-token").post(
    refreshAccessToken
);


router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/c/:username").get(verifyJWT, getUserChannelProfile);  // chuki params se data aa rha tha isliye, :username likhe h !!

export default router;