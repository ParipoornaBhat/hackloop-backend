const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const { roles } = require('../models/role');
const authMiddleware = require("../utils/authMiddleware");  // Correct import
const User = require("../models/user");

router.post("/docprofile", async (req, res) => {
    const {id}= req.body;
    try {
      const user = await User.findById(id);  // Fetch user from the database by _id
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the user data
      return res.status(200).json(user);
    } catch (err) {
      console.log("Error fetching user:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });


  module.exports=router;