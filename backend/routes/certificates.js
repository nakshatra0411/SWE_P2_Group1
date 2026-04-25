const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

const certificateController = require('../controllers/certificateController');

router.post('/', authenticate, authorizeRoles('student'), auditLogger('REQUEST_CERTIFICATE'), certificateController.createCertificateRequest);

router.get('/', authenticate, authorizeRoles('student'), certificateController.getStudentCertificates);

router.patch('/:id/approve', authenticate, authorizeRoles('admin', 'faculty'), auditLogger('APPROVE_CERTIFICATE'), certificateController.approveCertificate);

router.patch('/:id/reject', authenticate, authorizeRoles('admin', 'faculty'), auditLogger('REJECT_CERTIFICATE'), certificateController.rejectCertificate);

router.get('/:id/download', authenticate, certificateController.downloadCertificate);

module.exports = router;