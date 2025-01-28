import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';
dotenv.config();
import userModel from '../models/userModel.js'
import transporter from '../config/nodemailer.js';

export const register= async (req , res )=>{
    const {name , email, password}= req.body;
    if(!name || !email || !password){
        return res.json({success:false,message:'Missing Details'})

    }
    try {
              const existingUser= await userModel.findOne({email})
              if(existingUser){
                return res.json({success:false, message:'User already exists'});
              }
 
        const hasedPassword = await bcrypt.hash(password,10);
   const user = new userModel({name, email, password:hasedPassword})
   await user.save();


   const token = jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'7d'});

 res.cookie('token',token,{
    httpOnly:true ,
    secure:process.env.NODE_ENV==='production',
    sameSite: process.env.NODE_ENV==='production'?'none':'strict',
    maxAge: 7 * 24 *60 *60 *1000
 });

 // sending welcome email
 const  mailOptions={
    from:process.env.SMTP_SENDER,
    to:user.email,
    subject:'welcome by ankit shukla',
    text:`Welcome to websites  auth. Your account has been created email id
    :${user.email}`
 }

 await transporter.sendMail(mailOptions);

 return res.json({success:true});
    } catch (error) {
        res.json({success:false,message:error.message})
    }
}

export const login = async (req ,res )=>{
    const {email, password}= req.body;
    if(!email || !password){
        return res.json({success:false, message:'Email and password are required'})

    }
    try {
        
        const user = await userModel.findOne({email});
        if(!user){
            return  res.json({success:false, message:'Invalid Email'})
        }
        const isMatched = await bcrypt.compare(password, user.password)
        if(!isMatched){
            return res.json({success:false, message:'Invalid password'})
        }
        const token = jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'7d'});

        res.cookie('token',token,{
           httpOnly:true ,
           secure:process.env.NODE_ENV==='production',
           sameSite: process.env.NODE_ENV==='production'?'none':'strict',
           maxAge: 7 * 24 *60 *60 *1000
        });
        

        return res.json({success:true});

    } catch (error) {
        return res.json({success:false, message:error.message})
    }
}

export const logout = async (req ,res )=>{
    try {
        res.clearCookie('token',{
            httpOnly:true ,
            secure:process.env.NODE_ENV==='production',
            sameSite: process.env.NODE_ENV==='production'?'none':'strict'

        })
        return res.json({success:true,message:'Logged Out'});
        
    } catch (error) {
        return res.json({success:false, message:error.message})
    }
}

 export const  sendVerifyOtp= async (req,res)=>{
    try {
        const {userId}= req.body;
        const user= await userModel.findById(userId);
        if(user.isAccountVerified){
            return res.json({success:false, message:'Account already verified'})
        }
       const otp= String(Math.floor(Math.random()*900000 + 100000))
user.verifyOtp= otp;
user.verifyOtpExpireAt= Date.now() + 24*60*60*1000;

await user.save();

const mailOptions={
    from:process.env.SMTP_SENDER,
    to:email,
    subject:'welcome by ankit shukla',
    text:`Your OTP IS ${otp}. Verify your account using this otp.`
}
    
await transporter.sendMail(mailOptions)
res.json({success:true, message:'Verification otp sent on email'});
    } catch (error) {
        res.json({success:false, message:error.message});
    }
 }


 export const verifyEmail = async (req, res) =>{
    const {userId, otp}= req.body;

    if(!userId || !otp){
        return res.json({success:falase, message:'Missing Details'});
    }

    try {
        const user = await userModel.findById(userId);
        if(!user)
        {
            return res.json({success:false, message:'User not found'});
        }

        if(user.verifyOtp ==='' || user.verifyOtp!==otp ){
            return res.json({success:false, message:'Ivalid Otp'});
        }
        if(user.verifyOtpExpireAt<Date.now()){
            return res.json({success:false, message:'otp expired'});
        }
        user.isAccountVerified= true;

        user.verifyOtp='';
        user.verifyOtpExpireAt=0;
        await user.save();
        return res.json({success:true, message:'Email verified'});
    } catch (error) {
        return res.json({success:false,message:error.meesage});
    }
 }
// check if user is authenticated

 export const isAuthenticated = async(req, res)=>{
    try {
        
        return res.json({success:true})
    } catch (error) {
        return res.json({success:false,message:error.meesage});
    }
 }


 // send password reset otp

 export const sendResetOtp = async(req, res)=>{
    const {email}= req.body;

    if(!email){
        return res.json({success:false,message:'Email is required'});
    }
    try {
        const user= await userModel.findOne({email});

        if(!user){
            return res.json({success:false,message:'User Not found'});
        }

        const otp= String(Math.floor(Math.random()*900000 + 100000))
        user.resetOtp= otp;
        user.resetOtpExpireAt= Date.now() + 15*60*1000;
        
        await user.save();
        
        const mailOptions={
            from:process.env.SMTP_SENDER,
            to:email,
            subject:'Password Reset Otp',
            text:`Your OTP for resetting your password is ${otp} .
            Use this OTP to proceed with resetting your password.`
        }
            
        await transporter.sendMail(mailOptions)
        res.json({success:true, message:'OTP sent on email'});
            

    } catch (error) {
        return res.json({success:false,message:error.meesage});
    }
 }


 // Reset User password 
 export const resetPassword = async(req, res) =>{
    const {email , otp, newPassword}= req.body;

    if(!email || !otp |! newPassword){
        return res.json({success:false,message:'Email, OTP and new password are required'});
    }
    try {
        
const user = await userModel.findOne({email})
if(!user){
    return res.json({success:false,message:'User not found'});
}

if(user.resetOtp==='' || user.resetOtp !==otp){
    return res.json({success:false,message:'Invalid OTP'});
}

if(user.resetOtpExpireAt< Date.now()){
    return res.json({success:false,message:'OTP expired'});
}

const hasedPassword= await bcrypt.hash(newPassword, 10);
user.password= hasedPassword;
user.resetOtp= '';
user.resetOtpExpireAt=0;
await user.save();

return res.json({success:true,message:'Password has been reset successfully'});

    } catch (error) {
        return res.json({success:false,message:error.meesage});
    }
 }