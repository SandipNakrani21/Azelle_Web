import { Router } from "express";
import { publicCatalogue } from "../services/catalogue.js";
export const publicProductsRouter = Router();
publicProductsRouter.get("/",async(_req,res,next)=>{try{res.set("Cache-Control","no-store");res.json({products:await publicCatalogue()});}catch(error){next(error)}});
publicProductsRouter.get("/:slug",async(req,res,next)=>{try{const [product]=await publicCatalogue(String(req.params.slug).toLowerCase());if(!product)return res.status(404).json({error:"Product not found."});res.json({product});}catch(error){next(error)}});
