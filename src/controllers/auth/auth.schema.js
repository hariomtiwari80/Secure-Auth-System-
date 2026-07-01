import {z} from 'zod'

const registerSchema=z.object({
    email:z.email(),
    password:z.password().min(6),
    name:z.name().min(3)
})


export default registerSchema
