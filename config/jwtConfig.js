const crypto=require("crypto");
//gen random s key
const secretKey=crypto.randomBytes(32).toString('hex');
module.exports={
    secretKey:secretKey
};