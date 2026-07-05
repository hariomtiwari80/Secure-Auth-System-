import express from 'express'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.route.js'

const app=express()

app.use(express.json())
app.use(cookieParser())

app.get('/',(req,res)=>{
    res.send("Hello I am Okay")
})

app.use('/auth',authRouter)


export default app;

