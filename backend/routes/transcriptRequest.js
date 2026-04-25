const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

const transcriptRequestController = require('../controllers/transcriptRequestController');

// POST /api/student/transcript-request
router.post('/student/transcript-request', authenticate, authorizeRoles('student'), auditLogger('SUBMIT_TRANSCRIPT_REQ'), transcriptRequestController.createTranscriptRequest);

// GET /api/student/transcript-request
router.get('/student/transcript-request', authenticate, authorizeRoles('student'), transcriptRequestController.getStudentTranscriptRequests);

// GET /api/admin/transcript-request — list all (admin)
router.get('/admin/transcript-request', authenticate, authorizeRoles('admin'), transcriptRequestController.getAllTranscriptRequests);

// PATCH /api/admin/transcript-request/:id
router.patch('/admin/transcript-request/:id', authenticate, authorizeRoles('admin'), auditLogger('UPDATE_TRANSCRIPT_REQ'), transcriptRequestController.updateTranscriptRequestStatus);

module.exports = router;