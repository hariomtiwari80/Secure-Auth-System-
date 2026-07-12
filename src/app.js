import express from 'express'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.route.js'
import userRouter from './routes/user.route.js'
import adminRouter from './routes/admin.route.js'

const app=express()

app.use(express.json())
app.use(cookieParser())

app.get('/',(req,res)=>{
    res.send("Welcome to the Authentication API")
})

app.use('/auth',authRouter)
app.use('/user',userRouter)
app.use('/admin',adminRouter)


export default app;

