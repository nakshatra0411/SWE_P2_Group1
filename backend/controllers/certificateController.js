const Certificate = require('../models/Certificate');

exports.createCertificateRequest = async (req, res) => {
  try {
    const { type, purpose } = req.body;
    const certificate = new Certificate({
      studentId: req.user.userId,
      type,
      purpose
    });
    await certificate.save();
    res.status(201).json({ message: 'Certificate request submitted', data: certificate });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getStudentCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ studentId: req.user.userId }).sort({ createdAt: -1 });
    res.json(certificates);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.approveCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) return res.status(404).json({ error: 'Certificate not found' });

    if (certificate.status === 'Pending Department') {
      certificate.status = 'Pending Admin';
    } else if (certificate.status === 'Pending Admin') {
      certificate.status = 'Approved';
      certificate.downloadUrl = `/files/cert-${certificate._id}.pdf`;
    }

    await certificate.save();
    res.json({ message: `Certificate approved at current stage`, data: certificate });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.rejectCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected' },
      { new: true }
    );
    if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
    res.json({ message: `Certificate rejected`, data: certificate });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate || certificate.status !== 'Approved') {
      return res.status(400).json({ error: 'Certificate not available for download' });
    }
    const isOwner = certificate.studentId?.toString() === req.user.userId;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to download this certificate' });
    }
    res.json({ message: 'Download link ready', downloadUrl: certificate.downloadUrl });
  } catch (err) {
    console.error('downloadCertificate:', err);
    res.status(500).json({ error: 'Server error' });
  }
};