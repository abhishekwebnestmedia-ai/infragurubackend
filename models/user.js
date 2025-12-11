const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'agent', 'user'],
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
   isAgent: { type: Boolean, default: false },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  
 isApproved: { type: Boolean, default: false },

  permissions: {


    // Main Menu Access
    dashboard: { type: Boolean, default: true },
    teamdashboard: { type: Boolean, default: true },
    teammanagment: { type: Boolean, default: true },
    leads: { type: Boolean, default: true },
    leadUpload: { type: Boolean, default: true },
    boradcast: { type: Boolean, default: true },
    projectdev: { type: Boolean, default: true },
    agents: { type: Boolean, default: true },
    agentsmanagment: { type: Boolean, default: true },





  }


}, {

  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
