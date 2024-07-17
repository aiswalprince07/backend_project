const asyncHandler = (reqHandler) => {
    return (req,res,next) => {
        Promise.resolve(reqHandler(req,res,next)).
        catch((err) => next(err))
    }
}

// Error ka koi structure nhi h, to iska bhi utility bana lenge, jisse easy ho jayega !!



export {asyncHandler}









/*
// Hm ek wrapper code bana rhe, jo apne kaam ko easy kar rha, !


// Approch 1 === > Ye try, catch se handle kiya !!
const asyncHandler = (fn) => async(req,res,net) => {
    try{
        await fn(req,res,next)
    }catch(error){
        res.status(err.code || 500).json({
            success: false,
            message: err.message
        })
    }
}

*/