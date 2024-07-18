import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
        "-password -refeshToken"
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


export {registerUser}