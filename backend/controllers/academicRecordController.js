const Enrollment = require('../models/Enrollment');

const GRADE_POINTS = { 'AA': 10, 'AB': 9, 'BB': 8, 'BC': 7, 'CC': 6, 'CD': 5, 'DD': 4, 'fail': 0 };

const computeGPA = (enrollments) => {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const e of enrollments) {
    const credits = e.courseOffering?.course?.credits || 0;
    const points = GRADE_POINTS[e.grade];
    if (points !== undefined && credits > 0) {
      totalPoints += points * credits;
      totalCredits += credits;
    }
  }
  return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : null;
};

exports.getAcademicRecord = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const enrollments = await Enrollment.find({ student: studentId, status: 'completed' })
      .populate({ path: 'courseOffering', populate: { path: 'course', select: 'code name credits' } })
      .sort({ year: 1, semester: 1 });

    const semesterMap = {};
    for (const e of enrollments) {
      const key = `${e.year}-${e.semester}`;
      if (!semesterMap[key]) semesterMap[key] = { year: e.year, semester: e.semester, courses: [] };
      semesterMap[key].courses.push(e);
    }

    const semesters = Object.values(semesterMap)
      .map(sem => ({
        year: sem.year,
        semester: sem.semester,
        courses: sem.courses.map(e => ({
          code: e.courseOffering?.course?.code,
          name: e.courseOffering?.course?.name,
          credits: e.courseOffering?.course?.credits,
          grade: e.grade,
          gradePoints: GRADE_POINTS[e.grade] ?? null
        })),
        sgpa: computeGPA(sem.courses)
      }))
      .reverse();

    res.json({ studentId, cgpa: computeGPA(enrollments), semesters });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAcademicRecordBySemester = async (req, res) => {
  try {
    const [year, semester] = req.params.semester.split('-');

    const enrollments = await Enrollment.find({
      student: req.user.userId,
      status: 'completed',
      year: parseInt(year),
      semester
    }).populate({ path: 'courseOffering', populate: { path: 'course', select: 'code name credits' } });

    res.json({
      semester: req.params.semester,
      courses: enrollments.map(e => ({
        code: e.courseOffering?.course?.code,
        name: e.courseOffering?.course?.name,
        credits: e.courseOffering?.course?.credits,
        grade: e.grade,
        gradePoints: GRADE_POINTS[e.grade] ?? null
      })),
      sgpa: computeGPA(enrollments)
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
