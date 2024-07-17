import {v2 as cloudinary} from "cloudinary"
import fs from "fs";



// ye configuration hi h, jo ki apko file upload karne ki permission degi !!
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: CLOUDINARY_API_SECRET 
});



const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })

        // file has been uploaded successfully 
        console.log("File is uploaded on cloudiary",response.url);   // upload hone ke baad ek public URL milega !!
        return response
        
    }catch(error){
         fs.unlinkSync(localFilePath)  // remove the locally saved temporary file as the upload operation got failed
         return null;
    }
}


export {uploadOnCloudinary};