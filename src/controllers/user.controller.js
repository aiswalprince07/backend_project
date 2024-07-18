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



const changeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword, newPassword} = req.body;

    // change password karna h, means user login h phle se hi, to uski information hme 'req.user' se mil jayegi, becoz hmne middlware laga rhka !!
    
    const user = await User.findById(req.user?.id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;  // set ho gya ,ab save kar dunga
    await user.save({validateBeforeSave: false});
    
    return res.status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"));
})

const getCurrentUser = asyncHandler( async(req,res)=>{
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName, email} = req.body;
    if(!fullName || !email){
        throw new ApiError(400, "All fields are required");
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {   // mongoDB ke operator yha laga sakte , SET, COUNT, MIN, etc....
            $set:{
                fullName,   // TODO: inconsisteny dur karo
                email: email
            }

        },
        {
            new: true   // isme update hone ke baad jo info .. aati h usko return karta h,, isliye ab isko store bhi kar sakte !!   
        }
    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse(200, user, "Account details updated successfully"));

});

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path;   // multer middleware ke through mila file !!!
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing");
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar on cloudinary");
    }
 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new :true
        }
    ).select("-pasword")

    res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar updated successfully")
    )

})


const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverLocalPath = req.file?.path;   // multer middleware ke through mila file !!!
    if(!coverLocalPath){
        throw new ApiError(400, "cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverLocalPath);

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading coverImage on cloudinary");
    }
 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            new :true
        }
    ).select("-pasword")

    res
    .status(200)
    .json(
        new ApiResponse(200, user, "CoverImage updated successfully")
    )

})



const getUserChannelProfile = asyncHandler(async(req,res)=>{
    
    const {username}= req.params;

    if(!username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    // await User.find({username})   // app database se user loge, phir uske _id ke besis pe aggrigation lagaoge , but aap direct aggrigation laga sakte MATCH se

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()    // yha pe apne filter kar liye document, ab mere pass ek document , ab muzhe lookup karna h ex:chaiorcode
            }
        },
        {    // ab us chaiorcode ke kitne subscriber h, usko pta karne ke liye lookup ka use
            $lookup: {
                from: "subscriptions",    // always pural, all lowercase
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",    // always pural, all lowercase
                localField: "_id",
                foreignField: "subscriber",
                as: "subscriberedTo"
            }
        },
        {
            // ab inko add karna padega dono fields ko , or kuch alag se bhi add kar dega, 
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"    // fields h to always '$'
                },
                channelSubscribedToCount:{
                    $size: "$subscribedTo "
                },
                isSubscribed:{
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},   // $in se pta chega ki apke subscrbers me mera name h ki nhi!!!
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {   // m selected values ko hi project karunga !!
                fullName: 1,
                username: 1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1

            }
        }
    ])    // agrrigate se return arrays hote !!

    if(channel?.length){
        throw new ApiError(404, "channel does not exist");
    }
    
    return res
        .status(200)
        .json(
            new ApiResponse(200,channel[0],"User channel fetched sucessfully")
        )
})




export {
    registerUser, 
    loginUser ,
    logoutUser ,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}