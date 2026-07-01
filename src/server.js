import connectDB from "./config/db.js"
import dotenv from 'dotenv'
import http from 'http'
import app from './app.js'

dotenv.config()

const PORT = process.env.PORT || 5000;

async function startServer(){
    await connectDB()
    const server=http.createServer(app)
    server.listen(PORT,()=>{
        console.log(`Server is listening at PORT : ${PORT}`)
    })
}


startServer().catch((error)=>{
    console.log(`Server Failed in start : ${error.message}`)
    process.exit(1)
})