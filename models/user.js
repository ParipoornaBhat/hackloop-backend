const mongoose = require('mongoose');
const { roles } = require('../utils/constants');
const createHttpError = require('http-errors');

// Import the Notification model
const Notification = require('./notification');

// Define the DocSchema for Doctor Profile
const DocSchema = new mongoose.Schema({
  userid: { type: String },
  firstname: { type: String },
  lastname: { type: String },
  imr: { type: String },
  phone: { type: Number },
  address: { type: String },
  specialization: { type: String, lowercase: true },
  experience: { type: Number },
  feeperconsultation: { type: Number },
  from1: { type: String, lowercase: true },
  to1: { type: String, lowercase: true },
  from2: { type: String, lowercase: true },
  to2: { type: String, lowercase: true },
  workingDays: { type: Array },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

// Define the User Schema
const userSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, lowercase: true },
  password: { type: String },
  role: {
    type: String,
    enum: [roles.admin, roles.doctor, roles.patient],
    default: roles.patient
  },
  isDoctorRequested: {
    type: Boolean,
    default: false
  },
  // Embed notifications for the user
  notifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification'  // Reference to the Notification model
  }],
  // Embedding DocSchema inside the userSchema for doctor profile
  doctorProfile: { 
    type: DocSchema, 
    default: {} 
  },

  // Add references to Appointment and Prescription models
  appointments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }],
  prescription: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'  // This stores all prescriptions (current and past)
  }],
}, {
  timestamps: true,
});
userSchema.set('strictPopulate', false);

module.exports = mongoose.model('User', userSchema);
