import User from "../../models/user.model.js"
import sendEmail from "../../utils/email.js";
import hashPassword from "../../utils/hash.js"
import registerSchema from "./auth.schema.js"
import jwt from "jsonwebtoken";


const registerHandler=async(req,res)=>{
    try{
        const result=registerSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({
                success:false,
                message:'Invalid Data',
                errors:result.error.flatten().fieldErrors
            })
        }

        const {email,password}=result.data
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


const verifyEmailHandler=async(req,res)=>{
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