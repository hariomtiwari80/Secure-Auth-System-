


export const requireRole=(role)=>{
    return (req,res,next)=>{
        const authUser=req.user
        if(!authUser){
            return res.status(401).json({
                success:false,
                message:"You are not a auth user"
            })
        }
        if(authUser.role!==role){
            return res.status(403).json({
                success:false,
                message:"You don't have correct role"
            })
        }
        next()
    }
}