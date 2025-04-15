const bcrypt = require("bcrypt");
const User = require("../models/user");
const { generateToken } = require("../utils/jwtUtils");

async function login(email, password) {
  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid Credentials");
    }

    // Check if the password is valid
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid Credentials");
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return both token and user object (useful for the frontend to store)
    return { token, user  };
  
  } catch (err) {
    console.log(err);
    throw new Error("Error in login");
  }
}

module.exports = {
  login
};
