// admin.route.js
const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const { roles } = require('../models/role');
const authMiddleware = require("../utils/authMiddleware");  // Correct import
const User = require("../models/user");
// Correct route handler
router.get("/manage", authMiddleware.authenticateToken, async (req, res, next) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get('/users', async (req, res, next) => {
    try {
      const users = await User.find();
      res.json(users);  // Send users data as JSON
    } catch (error) {
      return res.status(400).json({ message: 'Invalid request in get user' });
    }
  });
  router.get('/docs', async (req, res, next) => {
    try {
      // Filter users by role 'DOCTOR' and select specific fields (e.g., name and doctorProfile)
      const users = await User.find({ role: 'DOCTOR' })
                               .select('_id doctorProfile name role');  // Only include necessary fields
      res.json(users);  // Send users with role 'DOCTOR' as JSON
    } catch (error) {
      return res.status(400).json({ message: 'Invalid request in get user' });
    }
  });
  
  router.post('/update-role', async (req, res, next) => {
    try {
      const { id, cid, role} = req.body;
      if (!id || !role) {
        return res.status(400).json({ message: 'Invalid request in update role' });
      }
  
      // Check for valid mongoose objectID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid id' });
      }
  
      const rolesArray = Object.values(roles);
      if (!rolesArray.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
  
      // Admin cannot remove himself/herself as an admin
      if (id === cid) {
        return res.status(400).json({
          message: 'Admins cannot remove themselves from Admin, ask another admin.',
        });
      }
  
      const user = await User.findByIdAndUpdate(id, { role }, { new: true });
      res.json({
        success: true,
        message: `Successfully updated role for ${user.email} to ${user.role}`,
      });    } catch (error) {
      res.json({ message: `EEEUpdated role for ${user.email} to ${user.role}` });

    }
  });
    

module.exports = router;
