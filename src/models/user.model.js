import {Schema,model} from 'mongoose'

const userSchema=new Schema({
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:['user','admin']
    },
    isEmailVerified:{
        type:Boolean,
        default:false
    },
    twoFactorEnabled:{
        type:Boolean,
        default:false
    },
    twoFactorSecret:{
        type:String,
        default:undefined
    },
    tokenVersion:{
        type:Number,
        default:0
    },
    resetPasswordToken:{
        type:String,
        default:undefined
    },
    resetPasswordExpires:{
        type:Date,
        default:undefined
    }
},{
    timestamps:true
})

const User=model('user',userSchema)

export default User