import { verifyAccessToken } from "../utils/token.js"
import {User} from "../models/user.model.js"


export const requireAuth=async(req,res,next)=>{
    const authHeader=req.headers.authorization
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({
            success:false,
            message:"You are not a auth user"
        })
    }

    const token=authHeader.split(" ")[1]

    try{
        const payload=verifyAccessToken(token)
        const user=await User.findById(payload.sub)
        if(!user){
            return res.status(401).json({
                success:false,
                message:"You are not a auth user"
            })
        }

        if(user.tokenVersion!==payload.tokenVersion){
            return res.status(401).json({
                success:false,
                message:"token invalidated"
            })
        }

        req.user={
            id:user._id,
            email:user.email,
            name:user.name,
            role:user.role,
            isEmailVerified:user.isEmailVerified
        }

        next()
    } 
    catch(error){
        return res.status(401).json({
            success:false,
            message:"Invalid or expired token",
        });
    }
}