const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'sales', 'user'],
    default: 'user',
    required: true
  },
  phoneNumber: { type: String },
  profileImage: { type: String },
  designation: { type: String },
  address: { type: String },
  empid: { type: String, unique: true },
  registeredAt: { type: Date, default: Date.now },
  firstLoginAt: { type: Date },
  firstLogoutAt: { type: Date },
  lastLoginAt: { type: Date },
  lastLogoutAt: { type: Date },
  isLoggedIn: { type: Boolean, default: false },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  
  permissions: {


    // Main Menu Access
    dashboard: { type: Boolean, default: false },
    teamdashboard: { type: Boolean, default: false },
    teammanagment: { type: Boolean, default: false },
    leads: { type: Boolean, default: false },
    leadUpload: { type: Boolean, default: false },
    boradcast: { type: Boolean, default: false },
    projectdev: { type: Boolean, default: false },
    agents: { type: Boolean, default: false },
    agentsmanagment: { type: Boolean, default: false },





  }


}, {

  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
