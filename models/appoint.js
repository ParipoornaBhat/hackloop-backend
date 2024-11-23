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
});




module.exports = mongoose.model('Appointment', appointmentSchema);
