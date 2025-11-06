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
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  
  //  permissions: {
  //   // Core / Access Control
  //   superAdmin: { type: Boolean, default: false },

  //   // Main Menu Access
  //   dashboard: { type: Boolean, default: false },
  //   dailyPlans: { type: Boolean, default: false },
  //   allLeads: { type: Boolean, default: false },
  //   inventory: { type: Boolean, default: false },
  //   projectsWorking: { type: Boolean, default: false },
  //   brokersRequirements: { type: Boolean, default: false },
  //   myTeam: { type: Boolean, default: false },
  //   findOpportunity: { type: Boolean, default: false },
  //   learnGrow: { type: Boolean, default: false },
  //   dataBase: { type: Boolean, default: false },

  //   // Leads Section (Sub Permissions)
  //   rentalLeads: { type: Boolean, default: false },
  //   buyerLeads: { type: Boolean, default: false },
  //   deadLeads: { type: Boolean, default: false },
  //   completedLeads: { type: Boolean, default: false },

  //   // Inventory Section (Sub Permissions)
  //   rentalInventory: { type: Boolean, default: false },
  //   saleInventory: { type: Boolean, default: false },
  //   completedInventory: { type: Boolean, default: false }
  // }

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
