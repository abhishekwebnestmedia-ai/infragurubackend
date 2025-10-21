const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const crypto = require('crypto');
const nodemailer = require('nodemailer');


exports.register = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, address, empid, designation } = req.body;


    let missingFields = [];
    if (!name) missingFields.push('Name is missing');
    if (!email) missingFields.push('Email is missing');
    if (!password) missingFields.push('Password is missing');

    if (missingFields.length > 0) {
      return res.status(400).json({ message: missingFields.join(', ') });
    }

    if (name.length < 3) {
      return res.status(400).json({ message: 'Name must be at least 3 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }


    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // --- Hash password ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- Save user ---
    const user = new User({
      name, email, password: hashedPassword, phoneNumber,   // ✅ Added
      // ✅ Added
      designation, address, empid,
    });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};




exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Field-specific validation ---
    let missingFields = [];
    if (!email) missingFields.push('Email is missing');
    if (!password) missingFields.push('Password is missing');

    if (missingFields.length > 0) {
      return res.status(400).json({ message: missingFields.join(', ') });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // ✅ Update login info
    if (!user.firstLoginAt) {
      user.firstLoginAt = new Date();   // only once
    }
    user.lastLoginAt = new Date();      // always update
    user.isLoggedIn = true;
    await user.save();

    // ✅ Include role in JWT
    const token = jwt.sign(
      {
        userId: user._id,
         name: user.name,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '9h' }
    );

    res.json({
      token,
      role: user.role,
      userId: user._id,

        name: user.name,
      userId: user._id,
      message: 'Login successful',
    });

  } catch (err) {
    console.error("❌ login error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};





exports.logout = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: 'User not found' });

    user.lastLogoutAt = new Date();
    user.isLoggedIn = false;  // Add this line
    await user.save();

    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, { _id: 1, name: 1, email: 1, role: 1 });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (err) {
    console.error("❌ getAllUsers error:", err);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};


exports.getTeams = async (req, res) => {
  try {
    const users = await User.find()
      .select("_id name email role phoneNumber designation address empid permissions") // ✅ Added permissions
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });

  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ message: "Server error" });
  }
};



exports.changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;       // ID of the user to update
    const { role } = req.body;           // new role

    // Only admin can change roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to change roles' });
    }

    // Validate role
    const validRoles = ['admin', 'sales', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

    userToUpdate.role = role;
    await userToUpdate.save();

    res.status(200).json({ message: 'Role updated successfully', user: userToUpdate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fullstackdeveloperabhi1@gmail.com',
    pass: 'geoe oqaq ngth kpfm'
  }
});



async function sendResetEmail(email, token) {
  const resetUrl = `https://realtyxpo.in/reset-password?token=${token}`;
  const mailOptions = {
    from: '"Realtyxpo" <fullstackdeveloperabhi1@gmail.com>',
    to: email,
    subject: 'Password Reset Request',
    html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to set a new password.</p>`
  };

  await transporter.sendMail(mailOptions);
}

// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) return res.status(400).json({ message: 'Email is missing' });

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: 'User not found' });

//     // Generate reset token and expiration
//     const resetToken = crypto.randomBytes(32).toString('hex');
//     user.passwordResetToken = resetToken;
//     user.passwordResetExpires = Date.now() + 3600000; // 1 hour expiry
//     await user.save();

//     // Send email with reset link
//     await sendResetEmail(email, resetToken);

//     res.json({ message: 'Password reset link sent to your email' });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.resetPassword = async (req, res) => {
//   try {
//     const { token, newPassword } = req.body;

//     if (!token || !newPassword)
//       return res.status(400).json({ message: 'Token and new password are required' });

//     const user = await User.findOne({
//       passwordResetToken: token,
//       passwordResetExpires: { $gt: Date.now() }
//     });

//     if (!user)
//       return res.status(400).json({ message: 'Invalid or expired reset token' });

//     if (newPassword.length < 6)
//       return res.status(400).json({ message: 'Password must be at least 6 characters' });

//     // Hash new password
//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(newPassword, salt);

//     // Remove reset token fields
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save();

//     res.json({ message: 'Password has been reset successfully' });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is missing' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // ✅ Generate hashed token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // ✅ Send raw token in email link
    const resetUrl = `https://realtyxpo.in/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: '"Realtyxpo" <fullstackdeveloperabhi1@gmail.com>',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset.</p>
        <p>Click <a href="${resetUrl}">here</a> to set a new password.</p>
        <p>This link will expire in 1 hour.</p>
      `
    };
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Password reset link sent to your email' });

  } catch (err) {
    console.error('❌ forgotPassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ message: 'Token and new password are required' });

    // ✅ Hash the token from user input
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // ✅ Validate token and expiry
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ message: 'Invalid or expired reset token' });

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    // ✅ Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // ✅ Clear reset fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });

  } catch (err) {
    console.error('❌ resetPassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};




exports.getLoggedInUsers = async (req, res) => {
  try {
    // Fetch all users, including their isLoggedIn status
    const users = await User.find().select('-password'); // no filter on isLoggedIn

    res.json({
      success: true,
      count: users.length,
      users: users,
    });
  } catch (err) {
    console.error("❌ getLoggedInUsers error:", err);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};


exports.getUsersLoginStatusSimple = async (req, res) => {
  try {
    const users = await User.find().select('name email isLoggedIn firstLoginAt firstLogoutAt lastLogoutAt');

    res.json({
      success: true,
      count: users.length,
      users: users,
    });
  } catch (err) {
    console.error("❌ getUsersLoginStatusSimple error:", err);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const userId = req.user.userId; // from JWT middleware

    const {
      name,
      email,
      phoneNumber,
      designation,
      address,
      empid,
    } = req.body;

    const updateData = {
      name,
      email,
      phoneNumber,
      designation,
      address,
      empid,
    };

    // Handle image upload
    if (req.file) {
      const imagePath = `/uploads/profileImages/${req.file.filename}`;
      updateData.profileImage = imagePath;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('❌ updateUser error:', err);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};


exports.updateUserPermissions = async (req, res) => {
  try {
    const adminUser = req.user; // from auth middleware (decoded token)

    // ✅ Allow only admins to update permissions
    if (adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can update permissions.' });
    }

    const { userId, permissions } = req.body;

    if (!userId || !permissions) {
      return res.status(400).json({ message: 'Missing userId or permissions object.' });
    }

    // ✅ Update target user's permissions
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { permissions },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Permissions updated successfully.',
      data: updatedUser.permissions
    });

  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};





