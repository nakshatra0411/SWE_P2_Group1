const Enrollment = require('../models/Enrollment');
const AttendanceSession = require('../models/AttendanceSession');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Announcement = require('../models/Announcement');

const GRADE_POINTS = { 'AA': 10, 'AB': 9, 'BB': 8, 'BC': 7, 'CC': 6, 'CD': 5, 'DD': 4, 'fail': 0 };
const ATTENDANCE_WARN_THRESHOLD = 75;

exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const [activeEnrollments, completedEnrollments] = await Promise.all([
      Enrollment.find({ student: studentId, status: 'enrolled' }).populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'code name credits' },
          { path: 'faculty', select: 'name' }
        ]
      }),
      Enrollment.find({ student: studentId, status: 'completed' }).populate({
        path: 'courseOffering',
        populate: { path: 'course', select: 'credits' }
      })
    ]);

    // CGPA from completed courses
    let totalPoints = 0;
    let totalCredits = 0;
    for (const e of completedEnrollments) {
      const credits = e.courseOffering?.course?.credits || 0;
      const points = GRADE_POINTS[e.grade];
      if (points !== undefined && credits > 0) {
        totalPoints += points * credits;
        totalCredits += credits;
      }
    }
    const cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : null;

    // Attendance warnings
    const activeCoIds = activeEnrollments.map(e => e.courseOffering?._id).filter(Boolean);
    const sessions = await AttendanceSession.find({ courseOffering: { $in: activeCoIds } });

    const attendanceMap = {};
    for (const s of sessions) {
      const coId = s.courseOffering.toString();
      if (!attendanceMap[coId]) attendanceMap[coId] = { total: 0, attended: 0 };
      attendanceMap[coId].total++;
      const record = s.records.find(r => r.student.toString() === studentId);
      if (record && record.status === 'present') attendanceMap[coId].attended++;
    }

    const attendanceWarnings = activeEnrollments
      .map(e => {
        const coId = e.courseOffering?._id?.toString();
        const stats = coId && attendanceMap[coId];
        if (!stats || stats.total === 0) return null;
        const percentage = Math.round((stats.attended / stats.total) * 100);
        if (percentage < ATTENDANCE_WARN_THRESHOLD) {
          return {
            courseCode: e.courseOffering?.course?.code,
            courseName: e.courseOffering?.course?.name,
            percentage,
            attended: stats.attended,
            total: stats.total
          };
        }
        return null;
      })
      .filter(Boolean);

    // Pending assignments (published, deadline not passed, not yet submitted)
    const now = new Date();
    const upcomingAssignments = await Assignment.find({
      courseOffering: { $in: activeCoIds },
      isPublished: true,
      deadline: { $gte: now }
    }).populate({ path: 'courseOffering', populate: { path: 'course', select: 'code name' } });

    const existingSubmissions = await Submission.find({
      student: studentId,
      assignment: { $in: upcomingAssignments.map(a => a._id) }
    }).select('assignment');

    const submittedIds = new Set(existingSubmissions.map(s => s.assignment.toString()));

    const pendingAssignments = upcomingAssignments
      .filter(a => !submittedIds.has(a._id.toString()))
      .map(a => ({
        assignmentId: a._id,
        title: a.title,
        courseCode: a.courseOffering?.course?.code,
        courseName: a.courseOffering?.course?.name,
        deadline: a.deadline,
        maxScore: a.maxScore
      }));

    // System + course announcements relevant to this student
    const announcements = await Announcement.find({
      isActive: true,
      $or: [
        { scope: 'system' },
        { scope: 'course', courseOffering: { $in: activeCoIds } }
      ]
    })
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      enrolledCourses: activeEnrollments.map(e => ({
        offeringId: e.courseOffering?._id,
        code: e.courseOffering?.course?.code,
        name: e.courseOffering?.course?.name,
        credits: e.courseOffering?.course?.credits,
        faculty: e.courseOffering?.faculty?.name,
        semester: e.semester,
        year: e.year
      })),
      totalEnrolled: activeEnrollments.length,
      cgpa,
      attendanceWarnings,
      pendingAssignments,
      announcements
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
