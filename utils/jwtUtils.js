const jwt=require('jsonwebtoken');
const {secretKey}=require("../config/jwtConfig");

function generateToken(user){
    const payload={
        id:user._id,
        email:user.email,
        role:user.role,
        all:user,
    }
    return jwt.sign(payload,secretKey,{expiresIn:"1h"});
}

module.exports={
    generateToken
};