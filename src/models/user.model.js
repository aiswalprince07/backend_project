import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique:true,
      required: true,
      lowercase: true,
      trim: true,
      index: true   // kisi bhi field ko searchable banana ho to, usmen index : true kar do !!
      // generally jab bhi apko searchable field banana ho to ,index: true
    },
    email: { 
        type: String,
        unique:true,
        required: true,
        lowercase: true,
        trim: true,
    },
    fullName:{
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index:true
    },
    avatar:{
        type: String,  // cloudinary url
        required: true,
    },
    coverImage:{
        type: String,  //cloudinary url
    },
    watchHistory:[
        {
            type: Schema.type.objectId,
            ref:"Video"
        },
    ],
    password:{
        type: String,
        required: [true, "Password is required"]
    },
    refeshToken:{
        type: String
    }
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function (next){
  // chiki , this ko sare values pata h, hook issi ko bolte h !!
  // ab jab koi bhi change hoga to password to change ho jayega ek problem h ye !!, 
  // to jab agar password me modification h tabhi sirf ussi time chalna chahiye ye function !!!

  if(!this.isModified("password")) next()

  this.password = bcrypt.hash(this.password,10)
  next()
})


UserSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password)
}

UserSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {   // payload
      _id:this._id,
      email: this.email,
      username:this.username,
      fullName:this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

UserSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {   // payload
      _id:this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}
export const User = mongoose.model("User", UserSchema);
