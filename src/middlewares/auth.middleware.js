// ye sirf varify karega ki user h ki nhi !!

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler( async(req,res,next) =>{
    try{
        // ab token ka access kaise loge , req ke pass cookie ka access h becoz middleware add kiya tha

    const token = req.cookie?.accessToken ||( req.header("Authorization")?.replace("Bearer ",""));
    

    console.log("Extracted Token:", token);
    console.log("Cookies:", req.cookies.accessToken);
    console.log("Authorization Header:", req.header("Authorization"));


    if(!token){
        throw new ApiError(401, "Unauthorrized request");
    }

    // Now check token sahi h ki nhi !!
    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)
    .select("-password -refreshToken")

    if(!user){
        // TODO: discuss about frontend
        throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
    }catch(error){
        throw new ApiError(401, error?.message || "Invalid access token");
    }

})
