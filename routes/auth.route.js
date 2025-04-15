const express = require("express");
const router = express.Router();

const morgan = require("morgan");
router.use(morgan("dev"));

const userModel = require("../models/user");

const bcrypt = require("bcrypt");
const createHttpError = require("http-errors");

const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
router.use(bodyParser.json());
const cors = require("cors");
router.use(cors());
const dotenv = require("dotenv");
require("dotenv").config();
router.use(express.json()); //1to get data from post
router.use(express.urlencoded({ extended: true })); //2to get data from post

const connectEnsureLogin = require("connect-ensure-login");

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const multerStorageCloudinary = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
      folder: 'CCProfile',
      format: file.mimetype.split('/')[1], // Ensures correct format
      allowed_formats: ['jpg', 'png', 'jpeg'], 
    }),
  });
  
  // Multer setup
  const upload = multer({ storage: multerStorageCloudinary });



const { roles } = require("../utils/constants");
const ConnectFlash = require("connect-flash");
router.use(ConnectFlash());
//const passport = require("passport");
const authService=require("../utils/login")
let currentOtp = "";
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  port: 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Disable SSL certificate validation (unsafe for production)
  },
});




router.post("/get-form-data", async (req, res, next) => {
 try{
  const { email, password } = req.body;
  const token =await authService.login(email,password)
  //send otp saying tht logged in
  const reciever = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Logged In",
    text: `Just informing You that You have logged in to your account`,
  };
  transporter.sendMail(reciever, (error, info) => {
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: `Error Login.${error}` });
    }
  });

  res.json({token:token});
 }catch(err){
  res.status(401).json({message:"invalid credentials"});
 }
});



router.post("/register", upload.single("profilePic"), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profilePicUrl = req.file ? req.file.path : "";

    let newUser;

    if (email === process.env.ADMIN_EMAIL) {
      newUser = await userModel.create({
        username,
        email,
        password: hashedPassword,
        role: roles.admin,
      });
    } else {
      newUser = await userModel.create({
        username,
        email,
        password: hashedPassword,
        profilePic: profilePicUrl,
        role: roles.user, // Assuming normal users should have a role too
      });
    }

    return res.status(201).json({ success: true, message: `${username}, registration successful!` });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ success: false, message: "User registration failed. Please try again." });
  }
});

router.post("/send-otp", async (req, res) => {
  const email = req.body.email;
  // Check if the email is already registered
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    return res
      .status(400)
      .json({ success: false, message: "Email already registered." });
  }

  // Generate a random 4-digit OTP
  const currentOtp = Math.floor(Math.random() * 9999 + 1).toString().padStart(4, '0');

  const reciever = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${currentOtp}`,
  };

  transporter.sendMail(reciever, (error, info) => {
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: `Error sending OTP.${error}` });
    }
    res.json({ success: true, otp: currentOtp });
  });
});
router.post("/verifyotp", async (req, res) => {
  const otp = req.body.otp;

  if (currentOtp === otp) {
    res.json({ success: true, message: `OTP Verified.` });
  } else {
    res.status(500).json({ success: false, message: `Incorrect OTP.` });
  }
});

router.post("/get-form-data-forgot", async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    await userModel
      .findOneAndUpdate(
        {
          email: email,
        }, //change password of b
        {
          password: hashedPassword,
        }
      )
      .then(
        res
          .status(200)
          .json({ success: true, message: `Password changed successfully!` })
      );
  } catch (error) {
    console.error("Error creating user:", error);
    // Respond with an error message
    res.status(400).json({
      success: false,
      message: `Password change unsuccesssfull${error}`,
    });
  }
});
router.post("/send-otpf", async (req, res) => {
  const email = req.body.email;

  // Check if the email is already registered
  const existingUser = await userModel.findOne({ email });
  if (!existingUser) {
    res.status(400).json({ success: false, message: "Email not registered." });
  }

  currentOtp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a random 4-digit OTP

  const reciever = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${currentOtp}`,
  };

  transporter.sendMail(reciever, (error, info) => {
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: `Error sending OTP.` });
    }
    res.json({ success: true, otp: currentOtp });
  });
});

router.get(
  "/logout", // Ensures user is logged in
  (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.log(err);
        return next(err); // Handle error if logout fails
      }
      // Respond to frontend indicating success
      res.json({ success: true }); // Respond with a JSON success message
    });
  }
);

module.exports = router;
