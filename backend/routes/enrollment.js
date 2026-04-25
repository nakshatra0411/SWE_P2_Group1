const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const enrollmentController = require('../controllers/enrollmentController');

// Specific routes before /:param routes
router.get('/drop-deadline', authenticate, authorizeRoles('student'), enrollmentController.getDropDeadline);

router.post('/', authenticate, authorizeRoles('student'), enrollmentController.enrollInCourse);
router.get('/', authenticate, authorizeRoles('student'), enrollmentController.getMyEnrollments);
router.delete('/:courseOfferingId', authenticate, authorizeRoles('student'), enrollmentController.dropCourse);

module.exports = router;
