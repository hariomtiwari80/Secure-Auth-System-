import {Router} from 'express'
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { User } from "../models/user.model.js";

const router=Router()

router.get("/me",requireAuth,requireRole("admin"),async(req, res)=>{
        const admin=await User.findById(req.user.id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }
        return res.status(200).json({
            success: true,
            user:admin,
        });
    }
)

export default router