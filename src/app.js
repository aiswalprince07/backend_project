import express from "express"
import cors from "cors"
import cookieParser from "cookie-Parser"  //** iska kaam h, ki mere server se user ka browser h uske ander ki cookie ko eccess kar pau , or cookie set kar pau ..means CRUD operation perform kar pau !!

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








export {app}