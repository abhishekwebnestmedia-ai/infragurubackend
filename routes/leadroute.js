


const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const authMiddleware = require("../middleware/authmiddleware");

// Create new lead
router.post('/create', authMiddleware, leadController.createLead);

// Bulk upload leads
router.post('/bulk-upload', authMiddleware, leadController.bulkUploadLeads);

// Get all leads (with populated assigned user details)
router.get('/getlead', authMiddleware, leadController.getLeads);
router.get('/unassigned', authMiddleware, leadController.getUnassignedLeads);

router.get('/getlead/:id', authMiddleware, leadController.getLeadById);

// Update a lead
router.put('/update/:id', authMiddleware, leadController.updateLead);

// Assign/Reassign a lead
router.patch('/assign/:id', authMiddleware, leadController.assignLead);
router.post('/bulk-assign',authMiddleware, leadController.bulkAssignLeads);
router.get('/teamassigned', authMiddleware, leadController.getTeamAssigned);
router.get('/dashLeads', authMiddleware,  leadController.getDashboardLead);

router.post("/dash/:userName", authMiddleware, leadController.getUserLeadStats);

router.delete('/delete', authMiddleware, leadController.deletebulk);
// Delete a lead
router.delete('/delete/:id', authMiddleware, leadController.deleteLead);
router.get('/userbasedlead',authMiddleware, leadController.getLeadsByUserName);
router.get('/captured', authMiddleware, leadController.getLeadsByCapturedBy);
router.get('/:leadId/history', authMiddleware, leadController.getLeadChangeHistory);

module.exports = router;













