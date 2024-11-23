export const signup = async (req, res) => {
  try {
    const { user, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    if (email === process.env.ADMIN_EMAIL) {
      const newUser = await userModel.create({
        username: user,
        email: email,
        password: hashedPassword,
        role: roles.admin, // Store the hashed password
      });
    } else {
      const newUser = await userModel.create({
        username: user,
        email: email,
        password: hashedPassword, // Store the hashed password
      });
    }
    // Respond with a success message
    res
      .status(200)
      .json({ success: true, message: `${user} Registration successful!` });
  } catch (error) {
    console.error("Error creating user:", error);
    // Respond with an error message
    res.status(400).json({
      success: false,
      message: `${user}User registration failed. Please try again.`,
    });
  }
};

export const login = async (req, res) => {};
export const forgotpw = async (req, res) => {};
export const logout = async (req, res) => {};
