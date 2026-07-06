import { success } from "zod";
import {User} from "../../models/user.model.js"
import {sendEmail} from "../../utils/email.js";
import {checkPassword, hashPassword} from "../../utils/hash.js"
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "../../utils/token.js";
import {loginSchema, registerSchema} from "./auth.schema.js"
import jwt from "jsonwebtoken";
import crypto from 'crypto'


export const registerHandler=async(req,res)=>{
    try{
        const result=registerSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({
                success:false,
                message:'Invalid Data',
                errors:result.error.flatten().fieldErrors
            })
        }

        const {name,email,password}=result.data
        const normalizedEmail=email.toLowerCase().trim()


        const existEmail=await User.findOne({email:normalizedEmail})
        if(existEmail){
            return res.status(409).json({
                success:false,
                message:"Email Already Exist"
            })
        }

        const passwordHash=await hashPassword(password)


        const newUser=await User.create({
            email:normalizedEmail,
            password:passwordHash,
            role:'user',
            isEmailVerified:false,
            twoFactorEnabled:false
        })


        const verifyToken=jwt.sign(
            {sub:newUser._id,email:newUser.email},
            process.env.JWT_ACCESS_SECRET,
            {
                expiresIn:'15m'
            }
        )

        const verifyUrl=`${process.env.CLIENT_URL}/auth/verify-email?token=${verifyToken}`


        await sendEmail(
            newUser.email,
            "verify your email",
            `
                <p>Click below to verify your email.</p>
                <a href="${verifyUrl}">
                    Verify Email
                </a>
            `
        )

        return res.status(201).json({
            success:true,
            message:"User registered successfully. Please verify your email.",
            user:{
                id:newUser._id,
                email:newUser.email,
                role:newUser.role,
                isEmailVerified:newUser.isEmailVerified,
            },
        });

    } 
    catch(error){
        console.error(error);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error",
        });
    }
}

export const verifyEmailHandler=async(req,res)=>{
    try {
        const token=req.query.token
        if(!token){
            return res.status(400).json({
                success:false,
                message:"Verification token is required",
            });
        }
        const payload=jwt.verify(token,process.env.JWT_ACCESS_SECRET)

        const user=await User.findById(payload.sub)
        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found",
            });
        }

        if(user.isEmailVerified) {
            return res.status(400).json({
                success:false,
                message:"Email is already verified",
            });
        }

        user.isEmailVerified=true;
        await user.save();
        return res.status(200).json({
            success:true,
            message:"Email verified successfully",
        });
    }
    catch(error){
        if(error.name==="TokenExpiredError") {
        return res.status(400).json({
            success:false,
            message:"Verification link expired",
        });
    }
    if(error.name==="JsonWebTokenError") {
        return res.status(400).json({
            success:false,
            message:"Invalid verification token",
        });
    }
    console.error(error);
    return res.status(500).json({
        success:false,
        message:"Internal Server Error",
    });
    }
}

export const loginHandler=async(req,res)=>{
    try {
        const result=loginSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({
                success:false,
                message:'Invalid Data',
                errors:result.error.flatten().fieldErrors
            })
        }

        const {email,password}=result.data
        const normalizedEmail=email.toLowerCase().trim()


        const user=await User.findOne({email:normalizedEmail})
        if(!user){
            return res.status(401).json({
                success:false,
                message:"Invalid Email or Password"
            })
        }

        const ok=await checkPassword(password,user.password)
        if(!ok){
            return res.status(401).json({
                success:false,
                message:"Invalid Password"
            })
        }

        if(!user.isEmailVerified){
            return res.status(403).json({
                success:false,
                message:"Please verify your email"
            })
        }
        const accessToken=createAccessToken(user._id,user.role,user.tokenVersion)
        const refreshToken=createRefreshToken(user._id,user.tokenVersion)

        const isProd=process.env.NODE_ENV==="production";
        res.cookie("refreshToken",refreshToken,{
            httpOnly:true,
            secure:isProd,
            sameSite:'lax',
            maxAge:7*24*60*60*1000
        })

        return res.status(200).json({
            success:true,
            message:"Login User Successfully",
            accessToken,
            user:{
                id:user._id,
                email:user.email,
                role:user.role,
                isEmailVerified:user.isEmailVerified,
                twoFactorEnabled:user.twoFactorEnabled
            }
        })
    } 
    catch(error){
        console.error(error);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error",
        });
    }
}

export const refreshHandler=async(req,res)=>{
    try {
        const token=req.cookies?.refreshToken
        if(!token){
            return res.status(401).json({
                success:false,
                message:"Refresh Token Missing"
            })
        }

       const payload=verifyRefreshToken(token)
       const user=await User.findById(payload.sub)
       if(!user){
        return res.status(401).json({
            success:false,
            message:"user not found"
        })
       } 
       if(user.tokenVersion!==payload.tokenVersion){
        return res.status(401).json({
            success:false,
            message:"refresh token invalidate"
        })
       }

       const newAccessToken=createAccessToken(user._id,user.role,user.tokenVersion)
       const newRefreshToken=createRefreshToken(user._id,user.tokenVersion)


       const isProd=process.env.NODE_ENV==="production";
        res.cookie("refreshToken",newRefreshToken,{
            httpOnly:true,
            secure:isProd,
            sameSite:'lax',
            maxAge:7*24*60*60*1000
        })

        return res.status(200).json({
            success:true,
            message:"token refreshed",
            accessToken: newAccessToken,
            user:{
                id:user._id,
                email:user.email,
                role:user.role,
                isEmailVerified:user.isEmailVerified,
                twoFactorEnabled:user.twoFactorEnabled
            }
        })

    } 
    catch(error){
        console.error(error);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token"
        });
    }
}

export const logoutHandler=async(req,res)=>{
    res.clearCookie('refreshToken',{path:'/'})
    return res.status(200).json({
        success: true,
        message:"logged out successfully"
    })
}

export const forgotPasswordHandler=async(req,res)=>{
    const {email}=req.body
    if(!email){
        return res.status(400).json({
            success:false,
            message:"Email is required"
        });
    }
    const normalisedEmail=email.toLowerCase().trim()

    try{
        const user=await User.findOne({email:normalisedEmail})
        if(!user){
            return res.status(200).json({
                success:true,
                message:"if email exists, we will send you a reset link"
            })
        }

        const rawToken=crypto.randomBytes(32).toString('hex')
        const tokenHash=crypto.createHash('sha256').update(rawToken).digest('hex')

        user.resetPasswordToken=tokenHash
        user.resetPasswordExpires=new Date(Date.now()+15*60*1000)
        await user.save()
        const resetUrl=`${process.env.CLIENT_URL}/auth/reset-password?token=${rawToken}`;

        await sendEmail(
            user.email,
            "Reset Your Password",
            `
                <p>click on below link </p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
            `
        )
        return res.status(200).json({
            success:true,
            message:"if email exists, we will send you a reset link"
        })

    } 
    catch(error){
        console.log(error);

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
    }

}

export const resetPasswordHandler=async(req,res)=>{
    const {token,password}=req.body
    if(!token){
        return res.status(400).json({
            success: false,
            message:"Reset Token is missing"
        })
    }
    if(!password || password.length<6){
        return res.status(400).json({
            success: false,
            message:"Password must be atleast 6 characters"
        })
    }

    try{
        const tokenHash=crypto.createHash('sha256').update(token).digest('hex')
        const user=await User.findOne({
            resetPasswordToken:tokenHash,
            resetPasswordExpires:{$gt:new Date()}
        })
        if(!user){
            return res.status(400).json({
                success:false,
                message:"Invalid or expired token"
            })
        }
        const newPassword=await hashPassword(password)
        user.password=newPassword
        user.resetPasswordToken=undefined
        user.resetPasswordExpires=undefined
        user.tokenVersion=user.tokenVersion+1

        await user.save();
        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } 
    catch(error){
        console.log(error);

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
    }
}
