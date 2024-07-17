import {asyncHandler} from "../utils/asyncHandler.js";

// ye method run kab ho --> jab koi user hit ho tab hona chahiye !! isliye routes banaya gya !!
const registerUser = asyncHandler( async(req,res) =>{
    // console.log("register function called");
    // console.log("request body",req.body);
    res.status(200).json({
        message: "chai or code"
    })
} )

export {registerUser}