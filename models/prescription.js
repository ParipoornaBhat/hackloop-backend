const mongoose = require('mongoose');

// Define the Prescription Schema
const prescriptionSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medication: [{
    name: String,
    dosage: String,
    instructions: String
  }],
  diagnosis: {
    type: String,
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
