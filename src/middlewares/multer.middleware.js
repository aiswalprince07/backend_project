import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {  // ye file multer me mil jta , cb --> callback
        cb(null, "./public/te   mp")
    },
    filename: function (req, file, cb) {
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)  // ye file ka name me prefix add karne ke liye use !!
        // cb(null, file.fieldname + '-' + uniqueSuffix)
        cb(null, file.originalname)
    }
})

export const upload = multer({ 
    storage,
})
 