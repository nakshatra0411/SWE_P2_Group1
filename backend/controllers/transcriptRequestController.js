const TranscriptRequest = require('../models/TranscriptRequest');

exports.createTranscriptRequest = async (req, res) => {
  try {
    const { purpose, numCopies, destination } = req.body;
    if (!purpose || !destination) {
      return res.status(400).json({ error: 'purpose and destination are required' });
    }
    const copies = parseInt(numCopies, 10) || 1;
    if (copies < 1 || copies > 10) {
      return res.status(400).json({ error: 'numCopies must be between 1 and 10' });
    }
    const request = new TranscriptRequest({
      studentId: req.user.userId,
      purpose,
      numCopies: copies,
      destination
    });
    await request.save();
    res.status(201).json({ message: 'Transcript request submitted successfully', data: request });
  } catch (err) {
    console.error('createTranscriptRequest:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getStudentTranscriptRequests = async (req, res) => {
  try {
    const requests = await TranscriptRequest.find({ studentId: req.user.userId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllTranscriptRequests = async (req, res) => {
  try {
    const requests = await TranscriptRequest.find()
      .populate('studentId', 'name userId email department')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateTranscriptRequestStatus = async (req, res) => {
  try {
    const { action } = req.body;
    const validActions = ['approve', 'reject', 'complete'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      complete: 'completed'
    };

    const update = { status: statusMap[action] };
    if (action === 'complete' && req.body.documentId) update.documentId = req.body.documentId;
    if (req.body.remarks) update.remarks = req.body.remarks;

    const request = await TranscriptRequest.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ message: `Transcript request ${action}ed`, data: request });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
