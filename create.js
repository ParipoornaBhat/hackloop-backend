const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user'); // Assuming your User model is in './models/user'

// Load environment variables from .env file
require('dotenv').config();

// MongoDB connection string
const dbURL = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name';

// Connect to MongoDB
mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    createUsers(); // Call the function to create users
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    mongoose.connection.close();
  });

// Function to create and hash password for users
async function createUser(username, email, password, role, doctorDetails = {}) {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user object
    const newUser = new User({
      username,
      email,
      password: hashedPassword, // Store the hashed password
      role,
      doctorProfile: doctorDetails, // Default to an empty object if not provided
    });

    // Save the user to the database
    await newUser.save();
    console.log(`${role} user created: ${username}`);
  } catch (err) {
    console.error('Error creating user:', err);
  }
}

// Function to create admin, doctor, and patient users
async function createUsers() {
  try {
    // Create an admin user
    await createUser('adminuser', 'admin@example.com', '456456', 'ADMIN');

    // Create a doctor user with doctor profile details
    const doctorDetails = {
      firstname: 'Dr. John',
      lastname: 'Doe',
      phone: 1234567890,
      address: '123 Clinic St., City, Country',
      specialization: 'Cardiology',
      experience: 10,
      feeperconsultation: 200,
      from1: '09:00',
      to1: '13:00',
      from2: '14:00',
      to2: '16:00',
      workingDays: ['1', '2', '3', '6'],
      status: 'active'
    };
    await createUser('doctoruser', 'doctor@example.com', '456456', 'DOCTOR', doctorDetails);

    // Create a patient user
    await createUser('patientuser', 'patient@example.com', '456456', 'PATIENT');

    // Close the MongoDB connection after creating users
    mongoose.connection.close();
  } catch (err) {
    console.error('Error creating users:', err);
    mongoose.connection.close();
  }
}
