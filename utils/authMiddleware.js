const jwt= require("jsonwebtoken");
const secretKey=require("../config/jwtConfig");

function authenticateToken(req,res,next){
    try{
    const authHeader= req.header("Authorization");
    if(!authHeader){
        return res.status(401).json({message:"Unauthorized: missing token"});
    }
    const[bearer,token]=authHeader.split(" ");
    if(bearer !=="Bearer"||!token){
        return res.status(401).json({message:"Unauthorized: invalid token format"});
    }
    jwt.verify(token, secretKey,(err,user)=>{
        if(err){
            return res.status(403).json({message:"Forbidden: Invalid Token"})
        }
        req.user=user;
        next();
    })}catch(error){
        console.log(error)
    }
}
// In authMiddleware.js
module.exports.authenticateToken = authenticateToken;

