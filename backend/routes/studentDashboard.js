const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const studentDashboardController = require('../controllers/studentDashboardController');

router.get('/', authenticate, authorizeRoles('student'), studentDashboardController.getStudentDashboard);

module.exports = router;
