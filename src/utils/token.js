import jwt from 'jsonwebtoken'

export const createAccessToken=(userId,role,tokenVersion)=>{
    const payload={sub:userId,role,tokenVersion}
    return jwt.sign(payload,process.env.JWT_ACCESS_SECRET,{
        expiresIn:"30m"
    }
    )
}

export const createRefreshToken=(userId,tokenVersion)=>{
    const payload={sub:userId,tokenVersion}

    return jwt.sign(payload,process.env.JWT_REFRESH_SECRET,{
        expiresIn:"7d"
    }
    )
}

export const verifyRefreshToken=(token)=>{
    return jwt.verify(token,process.env.JWT_REFRESH_SECRET)
}