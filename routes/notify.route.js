const express = require("express");
const router = express.Router();
const User = require("../models/user");  // Import User model

// Route to get user by ID (fetching user data including notifications)
router.post("/getuser", async (req, res) => {
  const { _id } = req.body;  // Get user ID from request body

  try {
    // Fetch user by ID and populate the notifications field
    const user = await User.findById(_id)
      .populate({
        path: 'notifications',  // Field to populate
        options: { sort: { createdAt: -1 } }  // Optionally sort notifications by creation date (most recent first)
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user data including populated notifications
    return res.status(200).json(user);
  } catch (err) {
    console.log("Error fetching user:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


// Route to update user data (notifications)
router.post("/update-user", async (req, res) => {
  const updatedUser = req.body;  // The updated user object from frontend

  try {
    
    // Find the user by _id and update with the updated user data
    const user = await User.findByIdAndUpdate(
      updatedUser._id,   // Use the _id from the updatedUser to find the correct user
      updatedUser,       // The updated user object with updated notifications
      { new: true }      // Return the updated user
    );
  
    if (!user) {
      return res.status(404).json({ message: "User not found" ,updatedUser});
    }

    // Return the updated user data
    return res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.log("Error updating user:", err);
    return res.status(500).json({ message: "Server error" });
  }
});



const Notification = require("../models/notification"); // Import Notification model

// Route to update a notification's seen status
router.post("/update-notification", async (req, res) => {
  const { notificationId, userId } = req.body;  // Get notification ID and user ID from request body

  try {
    // Find the notification by ID and update the "seen" field
    const updatedNotification = await Notification.findByIdAndUpdate(
      notificationId,   // Find notification by ID
      { seen: true },    // Set "seen" to true
      { new: true }      // Return the updated notification
    );

    if (!updatedNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Now, find the user and update the notifications array
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the notifications array in the user model (if necessary)
    user.notifications = user.notifications.map((notification) =>
      notification.toString() === notificationId ? updatedNotification._id : notification
    );

    await user.save(); // Save the user with the updated notification references

    return res.status(200).json({ message: "Notification updated and user notifications array modified" });
  } catch (err) {
    console.log("Error updating notification:", err);
    return res.status(500).json({ message: "Server error" });
  }
});





// Route to delete all notifications for a user
router.post("/delete-all-notifications", async (req, res) => {
  const { _id } = req.body;  // Get user ID from request body

  try {
    // Find the user by _id and clear their notifications
    const user = await User.findByIdAndUpdate(
      _id,
      { $set: { notifications: [] } },  // Clear notifications array
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return a success message
    return res.status(200).json({ message: "All notifications deleted successfully" });
  } catch (err) {
    console.log("Error deleting notifications:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/notifica/:userId", async (req, res) => {
  const { userId } = req.params;
  // Fetch the unseen notifications from the database
  const notifications = await Notification.find({ userId, seen: false });
  res.status(200).json(notifications);
});


module.exports = router;
