import mongoose from "mongoose";
const schema=new mongoose.Schema({customer:{type:mongoose.Schema.Types.ObjectId,ref:"Customer",required:true},hash:{type:String,unique:true,required:true},expiresAt:{type:Date,required:true}},{timestamps:true});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export const PasswordReset=mongoose.models.PasswordReset??mongoose.model("PasswordReset",schema);
