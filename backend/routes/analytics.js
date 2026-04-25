const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');

const analyticsController = require('../controllers/analyticsController');

router.get('/course/:courseId', authenticate, authorizeRoles('faculty', 'admin'), analyticsController.getCourseAnalytics);

router.get('/program/:programId', authenticate, authorizeRoles('admin'), analyticsController.getProgramAnalytics);

router.get('/department/:deptId', authenticate, authorizeRoles('admin'), analyticsController.getDepartmentAnalytics);

router.get('/student/:studentId', authenticate, authorizeRoles('faculty', 'admin', 'student'), (req, res, next) => {
  if (req.user.role === 'student' && req.params.studentId !== req.user.userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}, analyticsController.getStudentAnalytics);

module.exports = router;