import {Router} from 'express'
import { requireAuth } from '../middlewares/requireAuth.js'


const router=Router()

router.get('/me',requireAuth,async(req,res)=>{
    const authUser=req.user
    return res.status(200).json({
        success:true,
        user:authUser
    })
})

export default router