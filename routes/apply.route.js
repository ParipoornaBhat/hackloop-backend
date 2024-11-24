const express = require('express');
const router = express.Router();
const { roles } = require('../utils/constants');
const userModel = require('../models/user');
const Notification = require('../models/notification'); // Adjust the path if needed

// Route to handle doctor application (POST)
router.post('/apply', async (req, res) => {
    try {
        const { id, firstname, lastname, imr, phone, address, specialization, experience, feeperconsultation, from1, to1, from2, to2, workingDays } = req.body;

        // Validate the incoming data (could add more validation here)

        // Update user with doctor application details
        const updatedUser = await userModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    'isDoctorRequested': true,
                    'doctorProfile.userid': id,
                    'doctorProfile.firstname': firstname,
                    'doctorProfile.lastname': lastname,
                    'doctorProfile.imr': imr,
                    'doctorProfile.phone': phone,
                    'doctorProfile.address': address,
                    'doctorProfile.specialization': specialization,
                    'doctorProfile.experience': experience,
                    'doctorProfile.feeperconsultation': feeperconsultation,
                    'doctorProfile.from1': from1,
                    'doctorProfile.to1': to1,
                    'doctorProfile.from2': from2,
                    'doctorProfile.to2': to2,
                    'doctorProfile.workingDays': workingDays, // Directly replacing the workingDays array
                }
            },
            { new: true } // Return the updated document
        );

        // If no user is found or updated, send an error response
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create a notification for admin users
        

        // Save the notification to the database
        

        // Notify admins about the new doctor application by adding the notification reference
        const adminUsers = await userModel.find({ role: roles.admin });

        for (let adminuser of adminUsers) {
            const adminNotification = new Notification({
                user:adminuser._id,
                type: 'request',
                message: `${updatedUser.doctorProfile.firstname} ${updatedUser.doctorProfile.lastname} has applied for a doctor account.`,
                data: updatedUser.doctorProfile,
                onClickPath: "/admin/update-role2", // Update path if needed
                seen: false // Initially, set as not seen
            });
            await adminNotification.save();
            adminuser.notifications.push(adminNotification._id); // Add the notification reference to the admin's notifications array
            await adminuser.save(); // Save the updated admin user
        }

        // Create a notification for the doctor
        const doctorNotification = new Notification({
            type: 'submitted-request',
            user:id,
            message: "Your doctor application has been successfully submitted. We will notify you once it's reviewed.",
            data: updatedUser.doctorProfile,
            onClickPath: "/manageuser", // Link to the doctor's profile (could be a status page)
            seen: false // Initially, set as not seen
        });

        // Save the notification to the database
        await doctorNotification.save();

        // Add the doctor notification reference to the doctor's notifications array
        updatedUser.notifications.push(doctorNotification._id); // Add the notification reference to the user's notifications array
        await updatedUser.save(); // Save the updated doctor user

        // Send a success response
        res.status(200).json({
            success: true,
            message: 'Doctor application submitted successfully.',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error applying doctor:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred.'
        });
    }
});

router.post('/applye', async (req, res) => {
    try {
        const { id, firstname, lastname, imr, phone, address, specialization, experience, feeperconsultation, from1, to1, from2, to2, workingDays } = req.body;

        // Validate the incoming data (could add more validation here)

        // Update user with doctor application details
        const updatedUser = await userModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    'isDoctorRequested': true,
                    'doctorProfile.userid': id,
                    'doctorProfile.firstname': firstname,
                    'doctorProfile.lastname': lastname,
                    'doctorProfile.imr': imr,
                    'doctorProfile.phone': phone,
                    'doctorProfile.address': address,
                    'doctorProfile.specialization': specialization,
                    'doctorProfile.experience': experience,
                    'doctorProfile.feeperconsultation': feeperconsultation,
                    'doctorProfile.from1': from1,
                    'doctorProfile.to1': to1,
                    'doctorProfile.from2': from2,
                    'doctorProfile.to2': to2,
                    'doctorProfile.workingDays': workingDays, // Directly replacing the workingDays array
                }
            },
            { new: true } // Return the updated document
        );

        // If no user is found or updated, send an error response
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Send a success response
        res.status(200).json({
            success: true,
            message: 'Profie edited succesfully.',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error applying doctor:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred.'
        });
    }
});
module.exports = router;
