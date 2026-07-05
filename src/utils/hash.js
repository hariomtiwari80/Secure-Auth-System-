import bcrypt from 'bcrypt'

export const hashPassword=async(password)=>{
    const hash=await bcrypt.hash(password,10)
    return hash
}

export const checkPassword=async(password,hash)=>{
    return bcrypt.compare(password,hash)
}