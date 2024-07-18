import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken(); 

        user.refreshToken = refreshToken;  // ib isko save bhi karna hoga
        await user.save({validateBeforeSave: false}); // validation nhi  karke direct save kar denge !!
        
        return {accessToken,refreshToken}

    }catch(error){
        throw new ApiError(500,"something went wrong while generating refersh and access token")
    }
}


// ye method run kab ho --> jab koi user hit ho tab hona chahiye !! isliye routes banaya gya !!
const registerUser = asyncHandler( async(req,res) =>{
    // steps for creating a user
    /**
     * get user details from frontend
     * validation - not empty
     * check if user already exists: username, email
     * check for images, check for avatar
     * upload them to cloudinary, avatar
     * create user object - create entry in db
     * remove password and refresh token filed from response
     * check for user creation
     * return res
     * 
     * (algo design)
     */

    // 1.
    const {fullName, email, username, password} = req.body;  // form se data lene ke liye req.body !!
    // console.log("email", email);

    // if(fullName ===""){
    //     throw new ApiError(400, "fullname is required")
    // }  --> issi tarah sabko check kar sakte but iska bhi standerdtion h 

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required");
    }


    // Now check already exists  , User jo ki user.model se mila, ye bata dega ki user present h ki nhi
    const existedUser = await User.findOne({
        $or: [ { username }, { email } ]
    });

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists");
    }

    // Log req.files to inspect the files received
    console.log("Files received:", req.files);

    // check for images, avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    console.log("Avatar Local Path:", avatarLocalPath);
    console.log("Cover Image Local Path:", coverImageLocalPath);

    // let coverImageLocalPath;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
    }


    let avatar;
    try {
      avatar = await uploadOnCloudinary(avatarLocalPath);
      console.log('Avatar upload result:', avatar);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new ApiError(500, "Error uploading avatar");
    }
  
    let coverImage;
    if (coverImageLocalPath) {
      try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        console.log('Cover image upload result:', coverImage);
      } catch (error) {
        console.error('Error uploading cover image:', error);
        throw new ApiError(500, "Error uploading cover image");
      }
    }
  
    if (!avatar || !avatar.url) {
      throw new ApiError(500, 'Avatar upload failed, no URL returned.');
    }
  
    if (coverImage && !coverImage.url) {
      throw new ApiError(500, 'Cover image upload failed, no URL returned.');
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })
    // check karna tha ki user exist ki nhi , but ussse accha tarika ye h !!
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //checking user 
    if(!createdUser){
        throw new ApiError(500, "something went wrong while registering the user");
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200,createdUser, "User registered successfully")
    )

} )


const loginUser = asyncHandler( async(req,res) =>{
    /**Todos
     *  req.body --> data
     * username or email check
     * find the user
     * if user exist password check
     * access and refresh token create
     * mostly cookie me bhejte tokens ko
     * 
     */

    //1 
    const {username, email,password} = req.body;

    //2
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    //3
    const user = await User.findOne({
        $or:[{username}, {email}]
    });

    if(!user){
        throw new ApiError(404,"user does not exist");
    }

    //4 
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }

    //5 creating tokens ( chuki ye kayi jagah banaye to iska method hi bana lete  )
    const {accessToken, refreshToken} =await generateAccessAndRefreshTokens(user._id);

    //6 cookie me bhejna
    // kyo find kar rhe kyoki 'user' ke pass password nhi h kyo ki hmne nhi liye, ab hm ya to add kar le ya phir a database query kar le !!
    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken");

    // cookies bhejne se phle hme options define karne padte h!!
    const options = {
        httpOnly: true,   // chuki bydefault cookie ko koi bhi modify kar sakte , but u use httpOnly + secure tab sirf server se hi modify kar sakte !
        secure:true,
    }
    // chuki cookie-parser h or hme uska middleware inject kar diya hoga, isliye cookie method hmre pass h, isme {Key: Value ==>  ( Key,value,options)}pair kitni bhi cookies set kar sakte h !! 
    return res
    .status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken    // ye isliye bhej rhe, taki user local me store karna chah rha ho !!
            },
            "User logged in Sucessfully"
        )
    )

})


const logoutUser = asyncHandler( async(req,res)=>{
    /**
     * user find , but user ko find kaise  ( login me hmre pass email, username , password tha )
       ab iske liye hme .. khud ka middlware add karna padega, auth.middlware.js likha,
     *  
     */
    // const user = req.user._id;  | middleware se mil jayega user !!
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "User logged out sucessfully"));
});

const refreshAccessToken = asyncHandler(async(req,res)=>{
    try{
        const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)

    const user = User.findById(decodedToken._id)
    if(!user){
        throw new ApiError(401, "Invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshAccessToken){
        throw new ApiError(401, "Refresh token is expired or used")
    }

    const options = {
        httpOnly: true,
        secure:true
    } 
    const {accessToken, newRefreshToken }=  await generateAccessAndRefreshTokens(user._id);

    res.status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken: newRefreshToken },
            "Access token refreshed"
        )
    )
    }catch(error){
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
})

export {registerUser, loginUser , logoutUser , refreshAccessToken}