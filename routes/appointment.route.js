const express = require('express');
const router = express.Router();
const Appointment = require('../models/appoint');
const User = require('../models/user');
const Notification = require('../models/notification');
const Prescription = require('../models/prescription');
const nodemailer = require("nodemailer");
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

router.post('/getAvailableSlots', async (req, res) => {
    const { doctorId, date } = req.body;

    try {
        // Find the doctor's profile
        const doctor = await User.findById(doctorId);
        if (!doctor || !doctor.doctorProfile) {
          console.log("doc not found")
            return res.status(404).json({ message: "Doctor not found" });
        }

        const workingHours = doctor.doctorProfile;

        // Check if the doctor works on the selected date (must match one of workingDays)
        const selectedDate = new Date(date); // Ensure this is the local date
        if (process.env.NODE_ENV === 'production') {
        
          dayOfWeek = ((selectedDate.getDay()) + 1) % 7;
        } else {
          
          dayOfWeek = selectedDate.getDay();
        }
        if (!workingHours.workingDays.includes(dayOfWeek.toString())) {
       
            return res.status(404).json({ message: "Doctor is not available on this day" });
        } 

        // Find all appointments for the given doctor on the selected date
        // Adjust the selectedDate for the day range (start and end of the day)
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0)); // Start of the selected day
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999)); // End of the selected day

        // Modify the query to only consider appointments with 'confirmed' or 'requested' status
        const existingAppointments = await Appointment.find({
            doctor: doctorId,
            appointmentDate: {
                $gte: startOfDay,  // Start of the day
                $lt: endOfDay,     // End of the day
            },
            status: { $in: ['confirmed', 'requested'] } // Only include confirmed or requested appointments
        });

        // Generate available slots considering all appointments, even unconfirmed ones
        const availableSlots = generateAvailableSlots(workingHours, existingAppointments, selectedDate);
        return res.status(200).json(availableSlots);  // Return available slots
        
    } catch (err) {
        console.log("Error fetching available slots:", err);
        return res.status(500).json({ message: "Server error" });
    }
});


     

// Helper function to generate available slots
// Helper function to generate available slots
function generateAvailableSlots(workingHours, existingAppointments, date) {
    let slots = [];
    
    // Helper function to generate slots for a given start and end time
    function generateTimeSlots(fromTime, toTime) {
        let start = new Date(date);
        let end = new Date(date);
        start.setHours(fromTime.split(':')[0], fromTime.split(':')[1]);
        end.setHours(toTime.split(':')[0], toTime.split(':')[1]);

        // Convert the generated slot to UTC
        start = new Date(start.toISOString()); // UTC start time
        end = new Date(end.toISOString()); // UTC end time

        // Generate slots in 45-minute intervals with 10-minute gaps
        while (start < end) {
            const slotStart = new Date(start);
            const slotEnd = new Date(start);
            slotEnd.setMinutes(slotEnd.getMinutes() + 45); // 45-minute slot

            // Convert the generated slot to UTC for comparison
            const slotStartUTC = new Date(slotStart.toISOString());
            const slotEndUTC = new Date(slotEnd.toISOString());

            // Check if this slot is already booked by comparing the start and end times of existing appointments
            const slotBooked = existingAppointments.some(appointment => {
                const appointmentStartUTC = new Date(appointment.timeSlot.startTime);
                const appointmentEndUTC = new Date(appointment.timeSlot.endTime);

                // Check if this slot overlaps with an existing appointment
                return (
                    (slotStartUTC >= appointmentStartUTC && slotStartUTC < appointmentEndUTC) ||  // Slot starts during the appointment
                    (slotEndUTC > appointmentStartUTC && slotEndUTC <= appointmentEndUTC) ||      // Slot ends during the appointment
                    (slotStartUTC <= appointmentStartUTC && slotEndUTC >= appointmentEndUTC)      // Appointment fully covers the slot
                );
            });

            if (!slotBooked) {
                slots.push({
                    time: `${slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    startTime: slotStart,
                    endTime: slotEnd,
                    available: true,
                });
            }

            start.setMinutes(start.getMinutes() + 55); // Skip 10 minutes to next slot
        }
    }

    // Generate slots for first working period (from1 to to1)
    if (workingHours.from1 && workingHours.to1) {
        generateTimeSlots(workingHours.from1, workingHours.to1);
    }

    // Generate slots for second working period (from2 to to2)
    if (workingHours.from2 && workingHours.to2) {
        generateTimeSlots(workingHours.from2, workingHours.to2);
    }

    return slots;
}


router.post('/bookAppointment', async (req, res) => {
  const { patientId, doctorId, appointmentDate, timeSlot, description } = req.body;

  try {
      // Make sure timeSlot is an object with the required fields
      if (!timeSlot || !timeSlot.time || !timeSlot.startTime || !timeSlot.endTime || timeSlot.available === undefined) {
          return res.status(400).json({ success: false, message: 'Invalid timeSlot data' });
      }

      // Create a new appointment
      const newAppointment = new Appointment({
          patient: patientId,
          doctor: doctorId,
          appointmentDate,
          timeSlot,
          description,
      });

      // Fetch the patient's existing prescriptions
      const patient = await User.findById(patientId).populate('prescription');
      const existingPrescriptions = patient.prescription;

      // If the patient has any previous prescriptions, link them to the new appointment
      if (existingPrescriptions && existingPrescriptions.length > 0) {
          newAppointment.previousPrescriptions = existingPrescriptions.map(prescription => prescription._id);
      }

      // Save the new appointment
      await newAppointment.save();

      // Add notification for the doctor
      const doctorNotification = new Notification({
          user: doctorId,
          type: 'appointment',
          message: `You have a new appointment request from ${patient.username}.`,
          onClickPath: `/appointments/${newAppointment._id}`, // Notification path for doctor
      });
      await doctorNotification.save();

      // Add the notification to the doctor's notifications
      const doctorUser = await User.findById(doctorId);
      doctorUser.notifications.push(doctorNotification._id);
      await doctorUser.save();

      // Add the new appointment reference to the doctor's appointments array
      doctorUser.appointments.push(newAppointment._id);
      await doctorUser.save();

      // Add notification for the patient (submitted request)
      
      const patientNotification = new Notification({
          user: patientId,
          type: 'submitted-request',
          message: `Your appointment request with Dr. ${doctorUser.doctorProfile.firstname} has been successfully submitted.`,
          onClickPath: `/appointments/${newAppointment._id}`, // Notification path for patient
      });
      await patientNotification.save();

      // Add the notification to the patient's notifications
      patient.notifications.push(patientNotification._id);
      await patient.save();

      // Add the new appointment reference to the patient's appointments array
      patient.appointments.push(newAppointment._id);
      await patient.save();

      // Respond with success
      const recieverd = {
        from: process.env.EMAIL_USER,
        to: doctorUser.email,
        subject: "Logged In",
        text: `You have a new appointment request from ${patient.username}.`,
      };
      transporter.sendMail(recieverd, (error, info) => {
        if (error) {
          return res
            .status(500)
            .json({ success: false, message: `Error Login.${error}` });
        }
      });
      res.json({ success: true, message: 'Appointment booked successfully!' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to book appointment' });
  }
});



router.post('/dappointment', async (req, res) => {
  try {
    const { apid } = req.body;  // Extract apid from the request body

    // Find the appointment by its ID and populate patient, doctor, previousPrescriptions, and prescription
    const appointment = await Appointment.findById(apid)
      .populate('patient')            // Populate patient with all fields
      .populate('doctor')             // Populate doctor with all fields
      .populate('previousPrescriptions')  // Populate previous prescriptions
      .populate('prescription');      // Populate the prescription field

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Send the full appointment object as the response
    res.json(appointment);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to fetch appointment details', message: err.message });
  }
});



// Confirm appointment route
router.post('/appointments/:apid/confirm', async (req, res) => {
  const { apid } = req.params;

  try {
    const appointment = await Appointment.findById(apid);

    if (!appointment || appointment.status !== 'requested') {
      return res.status(400).json({ message: 'Appointment cannot be confirmed.' });
    }

    // Update the appointment status to 'confirmed'
    appointment.status = 'confirmed';
    await appointment.save();

    // Create a notification for the patient
    const doctor = await User.findById(appointment.doctor);

    const patient = await User.findById(appointment.patient);
    const notificationMessage = `Your appointment with Dr. ${doctor.doctorProfile.firstname} ${doctor.doctorProfile.lastname} has been confirmed.`;

    const patientNotification = await Notification.create({
      user: patient._id,
      type: 'appointment',
      message: notificationMessage,
      seen: false,
      onClickPath: `/appointments/${apid}`,
    });
    const recieverp = {
      from: process.env.EMAIL_USER,
      to: patient.email,
      subject: "Patient appointment Confirmation",
      text: `Just informing You that Your Appointment with Dr. ${doctor.doctorProfile.firstname} ${doctor.doctorProfile.lastname} has been confirmed.`,
    };
    transporter.sendMail(recieverp, (error, info) => {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: `Error Login.${error}` });
      }
    });
    // Push the notification ID into the patient's notifications array
    patient.notifications.push(patientNotification._id);
    await patient.save();

    // Optionally, create a notification for the doctor
    const doctorNotificationMessage = `You have confirmed an appointment with ${patient.username}.`;

    const doctorNotification = await Notification.create({
      user: doctor._id,
      type: 'appointment',
      message: doctorNotificationMessage,
      seen: false,
      onClickPath: `/appointments/${apid}`,
    });
    
    // Push the notification ID into the doctor's notifications array
    doctor.notifications.push(doctorNotification._id);
    await doctor.save();

    res.status(200).json({ success: true, message: 'Appointment confirmed and notifications sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel appointment route
router.post('/appointments/:apid/cancel', async (req, res) => {
  const { apid } = req.params;

  try {
    const appointment = await Appointment.findById(apid);

    if (!appointment || appointment.status !== 'requested') {
      return res.status(400).json({ message: 'Appointment cannot be cancelled.' });
    }

    // Update the appointment status to 'cancelled'
    appointment.status = 'cancelled';
    await appointment.save();

    // Create a notification for the patient
    const patient = await User.findById(appointment.patient);
    const doctor = await User.findById(appointment.doctor);

    const notificationMessage = `Your appointment with Dr. ${doctor.doctorProfile.firstname} ${doctor.doctorProfile.lastname} has been cancelled.`;

    const patientNotification = await Notification.create({
      user: patient._id,
      type: 'appointment',
      message: notificationMessage,
      seen: false,
      onClickPath: `/appointments/${apid}`,
    });

    // Push the notification ID into the patient's notifications array
    patient.notifications.push(patientNotification._id);
    await patient.save();

    const recieverp = {
      from: process.env.EMAIL_USER,
      to: patient.email,
      subject: "Patient appointment Cancelled",
      text: `Your appointment with Dr. ${doctor.doctorProfile.firstname} ${doctor.doctorProfile.lastname} has been cancelled.`,
    };
    transporter.sendMail(recieverp, (error, info) => {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: `Error Login.${error}` });
      }
    });
    
    // Optionally, notify the doctor about the cancellation
    const doctorNotificationMessage = `The appointment with ${patient.username} has been cancelled.`;

    const doctorNotification = await Notification.create({
      user: doctor._id,
      type: 'appointment',
      message: doctorNotificationMessage,
      seen: false,
      onClickPath: `/appointments/${apid}`,
    });

    // Push the notification ID into the doctor's notifications array
    doctor.notifications.push(doctorNotification._id);
    await doctor.save();


    const recieverd = {
      from: process.env.EMAIL_USER,
      to: patient.email,
      subject: "Patient appointment Cancellation",
      text: `The appointment with ${patient.username} has been cancelled.`,
    };
    transporter.sendMail(recieverd, (error, info) => {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: `Error Login.${error}` });
      }
    });
    res.status(200).json({ message: 'Appointment cancelled and notifications sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assuming User and Appointment models are properly defined
router.post('/appointments', async (req, res) => {
  const { id } = req.body;  // Expect the id to come in as part of the request body

  if (!id) {
    return res.status(400).json({ message: 'User ID is required' }); // Handle missing ID
  }

  try {
    // Find the user by _id
    const user = await User.findById(id)
      .select('appointments')  // Only fetch the appointments array from the user
      .populate({
        path: 'appointments',   // Populate the appointments array
        populate: [
          { 
            path: 'patient doctor', 
            select: 'username role doctorProfile'  // Populate patient and doctor info
          },
          { 
            path: 'timeSlot', 
            select: 'startTime endTime'  // Populate timeSlot info (or any relevant fields)
          }
        ]
      })
      .exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send back the populated appointments
    res.status(200).json(user.appointments);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching appointments' });
  }
});



router.post('/appointments/:apid/delete-d', async (req, res) => {
  const { apid } = req.params;

  try {
    const appointment = await Appointment.findById(apid);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Use deleteOne() instead of remove()

    // Remove appointment from user schema
    const doctor = await User.findById(appointment.doctor);

    // Ensure patient and doctor exist before modifying their appointments array
    

    if (doctor) {
      doctor.appointments = doctor.appointments.filter(id => id.toString() !== apid);
      await doctor.save();
    }

    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Failed to delete appointment' });
  }
});
router.post('/appointments/:apid/delete-p', async (req, res) => {
  const { apid } = req.params;

  try {
    const appointment = await Appointment.findById(apid);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Use deleteOne() instead of remove()
    

    // Remove appointment from user schema
    const patient = await User.findById(appointment.patient);

    // Ensure patient and doctor exist before modifying their appointments array
    if (patient) {
      patient.appointments = patient.appointments.filter(id => id.toString() !== apid);
      await patient.save();
    }
   res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Failed to delete appointment' });
  }
});


//completion



router.post('/completeAppointment', async (req, res) => {
  try {
    const { apid, medication, doctorId, patientId } = req.body;

    // Create the prescription
    const newPrescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      medication,
      diagnosis: req.body.diagnosis, 
       // Add diagnosis if provided
      appointment: apid,
    });

    const savedPrescription = await newPrescription.save();

    // Update the appointment with the prescription
    const appointment = await Appointment.findByIdAndUpdate(
      apid,
      { status: 'completed', prescription: savedPrescription._id },
      { new: true }
    );

    // Update the user (patient) with the prescription reference
    await User.findByIdAndUpdate(
      patientId,
      { $push: { prescription: savedPrescription._id } }, // Add the prescription ID to the user's prescriptions array
      { new: true }
    );

    // Create notification for the patient
    const notification = new Notification({
      type: 'appointment',
      message: 'Your appointment is completed, and a prescription has been added.',
      user: patientId,
      onClickPath: `/appointments/${apid}`,
    });

    await notification.save();
    const recieverp = {
      from: process.env.EMAIL_USER,
      to: patient.email,
      subject: "Patient appointment Completed",
      text: `Your appointment with Dr. ${doctor.doctorProfile.firstname} ${doctor.doctorProfile.lastname} has been Completed.`,
    };
    transporter.sendMail(recieverp, (error, info) => {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: `Error Login.${error}` });
      }
    });
   
    // Send the saved prescription as a response
    res.status(200).json(savedPrescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error completing appointment and saving prescription' });
  }
});

router.post('/prescriptions', async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate that the userId is provided
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Find the user by ID to ensure the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Fetch prescriptions for the user, including appointment and doctor details
    const prescriptions = await Prescription.find({ patient: userId })
      .populate('doctor', '_id doctorProfile.firstname doctorProfile.lastname doctorProfile.specialization doctorProfile.experience')  // Populate doctor details
      .populate('appointment', 'appointmentDate timeSlot')  // Populate appointment details
      // Populate appointment details
      .exec();
    // Return the prescriptions to the client


    res.json(prescriptions);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch prescriptions', error: error.message });
  }
});

// Export the routes
module.exports = router;
