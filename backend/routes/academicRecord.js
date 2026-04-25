const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const academicRecordController = require('../controllers/academicRecordController');

router.get('/', authenticate, authorizeRoles('student'), academicRecordController.getAcademicRecord);
router.get('/:semester', authenticate, authorizeRoles('student'), academicRecordController.getAcademicRecordBySemester);

module.exports = router;
