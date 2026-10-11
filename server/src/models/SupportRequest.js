import mongoose from "mongoose";
const schema = new mongoose.Schema({
  kind: {type:String,enum:["contact","bulk","gst"],required:true},
  name: {type:String,required:true,maxlength:80}, email: {type:String,required:true,maxlength:120},
  phone: {type:String,maxlength:30,default:""}, message: {type:String,maxlength:3000,default:""},
  details: {type:mongoose.Schema.Types.Mixed,default:{}},
  status: {type:String,enum:["new","resolved"],default:"new"},
}, {timestamps:true});
export const SupportRequest = mongoose.models.SupportRequest ?? mongoose.model("SupportRequest",schema);
