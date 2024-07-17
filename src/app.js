import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; // Corrected the typo

const app = express()


//explore it !!!
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
})) // iske andar options bhi de sakte h !!


//setting karni padegi , becoz data aane wla h kayi jagah se, URL se, JSON me data ,body se data aayega !!
app.use(express.json({limit: "16kb"})) // iska means, json data ko accept karunga!! ( iske ander bhi option  milta h )
app.use(express.urlencoded({extended: true, limit: "16kb"}))  // extended means, object ke ander object de sakte h !!
app.use(express.static("public")) // ** ek public accesset bana dete takki images, favicon ..to inko publicly rakh lu to uske liye ye configuration h !!
app.use(cookieParser())





// routes
// alag se isliye , segrigate kar rhe chijo ko takii easily manageable ho !! 

import userRouter from "./routes/user.routes.js"



//routes declaration
// app.get ... nhi likh sakte yha, chuki chijo ko segrigate kar diye isliye ab hmko middleare lana padega  (app.use(...ab iske andar routes or sare routes likh sakte ))
app.use("/api/v1/users",userRouter);   // yha '/users' ek prefix ki tarah use hoga !! ab URL banega --> http://locahost:3000/api/v1/users




// catching all route -[fro debugging ]

// app.use((req, res, next) => {
//     console.log(`Request received at: ${req.url}`);
//     next();
// });

// app.use((req, res) => {
//     res.status(404).send("Route not found");
// });



export {app}