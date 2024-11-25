const mongoose = require('mongoose');

// Define the Appointment Schema
const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointmentDate: { type: Date, required: true },
  timeSlot: {
    time: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    available: { type: Boolean, required: true },
  },
  description: { type: String },
  status: {
    type: String,
    enum: ['requested', 'confirmed', 'completed', 'cancelled'],
    default: 'requested',
  },
  previousPrescriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',  // This stores the patient's previous prescriptions at the time of the appointment
  }],
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',  // The new prescription issued after the appointment
      // It can be null if no prescription is issued
  },
});

module.exports = mongoose.model('Appointment', appointmentSchema);
