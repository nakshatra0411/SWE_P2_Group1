const Enrollment = require('../models/Enrollment');
const CourseOffering = require('../models/CourseOffering');
const SystemConfig = require('../models/SystemConfig');

exports.enrollInCourse = async (req, res) => {
  try {
    const { courseOfferingId } = req.body;
    const studentId = req.user.userId;

    const offering = await CourseOffering.findById(courseOfferingId).populate({
      path: 'course',
      populate: { path: 'prerequisites', select: '_id' }
    });
    if (!offering) return res.status(404).json({ error: 'Course offering not found' });
    if (!offering.isOpen) return res.status(400).json({ error: 'Course registration is closed' });
    if (offering.enrolled >= offering.capacity) return res.status(400).json({ error: 'Course is at full capacity' });

    const existing = await Enrollment.findOne({ student: studentId, courseOffering: courseOfferingId });
    if (existing) return res.status(409).json({ error: 'Already enrolled in this course' });

    if (offering.course.prerequisites && offering.course.prerequisites.length > 0) {
      const completed = await Enrollment.find({ student: studentId, status: 'completed' })
        .populate({ path: 'courseOffering', select: 'course' });

      const completedCourseIds = completed.map(e => e.courseOffering?.course?.toString()).filter(Boolean);
      const hasPrereqs = offering.course.prerequisites.every(p => completedCourseIds.includes(p._id.toString()));
      if (!hasPrereqs) return res.status(400).json({ error: 'Prerequisites not satisfied' });
    }

    const enrollment = await Enrollment.create({
      student: studentId,
      courseOffering: courseOfferingId,
      semester: offering.semester,
      year: offering.year
    });

    await CourseOffering.findByIdAndUpdate(courseOfferingId, { $inc: { enrolled: 1 } });

    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already enrolled in this course' });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user.userId,
      status: { $in: ['enrolled', 'completed'] }
    }).populate({
      path: 'courseOffering',
      populate: [
        { path: 'course', select: 'code name credits description type' },
        { path: 'faculty', select: 'name' },
        { path: 'instructors', select: 'name userId' }
      ]
    });
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.dropCourse = async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();
    const now = new Date();
    if (now > new Date(config.dropDeadline)) {
      return res.status(400).json({ error: 'Drop deadline has passed' });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user.userId,
      courseOffering: req.params.courseOfferingId,
      status: 'enrolled'
    }).populate({ path: 'courseOffering', populate: { path: 'course', select: 'credits' } });

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    const activeEnrollments = await Enrollment.find({ student: req.user.userId, status: 'enrolled' })
      .populate({ path: 'courseOffering', populate: { path: 'course', select: 'credits' } });

    const totalCredits = activeEnrollments.reduce((sum, e) => sum + (e.courseOffering?.course?.credits || 0), 0);
    const dropCredits = enrollment.courseOffering?.course?.credits || 0;

    if (totalCredits - dropCredits < config.minCredits) {
      return res.status(400).json({ error: `Cannot drop: would fall below minimum ${config.minCredits} credits` });
    }

    enrollment.status = 'dropped';
    await enrollment.save();
    await CourseOffering.findByIdAndUpdate(enrollment.courseOffering._id, { $inc: { enrolled: -1 } });

    res.json({ message: 'Course dropped successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getDropDeadline = async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();
    res.json({ dropDeadline: config.dropDeadline, minCredits: config.minCredits });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
