const mongoose = require('mongoose');

// Import the User model to create a reference in the Notification schema
const User = require('./user');  // Adjust the path if necessary

// Define the Notification Schema
const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['appointment', 'approval', 'cancel', 'reminder', 'general', 'request', 'submitted-request'], // Add more types as needed
    required: true
  },
  message: {
    type: String,
    required: true
  },
  seen: {
    type: Boolean,
    default: false
  },
  onClickPath: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the User model
    ref: 'User', // The model name that this field refers to
    required: true // Ensures that each notification has an associated user
  },
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Export the Notification model
module.exports = mongoose.model('Notification', notificationSchema);
