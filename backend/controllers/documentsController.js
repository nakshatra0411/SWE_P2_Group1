const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Document = require('../models/Document');
const { sendDataUrl } = require('../utils/fileHelper');

const GRADE_POINTS = { AA: 10, AB: 9, BB: 8, BC: 7, CC: 6, CD: 5, DD: 4, fail: 0 };
const SEM_ORDER   = { Monsoon: 1, Winter: 2, Summer: 3 };
const ROM         = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];

const semSortKey = (sem, year) => parseInt(year) * 10 + (SEM_ORDER[sem] ?? 9);

const academicYear = (semester, year) => {
  const y = parseInt(year);
  if (semester === 'Summer') return `${y - 1}-${String(y).slice(-2)}`;
  return `${y}-${String(y + 1).slice(-2)}`;
};

// Draw one text item at exact (x, y); never rely on doc.y for layout
function t(doc, text, x, y, opts = {}) {
  doc.text(String(text), x, y, { lineBreak: false, ...opts });
}

// Thin horizontal rule
function rule(doc, x, y, w, color = '#aaa', lw = 0.4) {
  doc.moveTo(x, y).lineTo(x + w, y).strokeColor(color).lineWidth(lw).stroke();
}

// Draw one semester block at (colX, startY) with given colW; returns ending Y
function drawSemBlock(doc, colX, startY, colW, semLabel, courses, spiStr) {
  const LINE_H = 11;
  const CODE_W = 42, CR_W = 16, GR_W = 18;
  const NAME_W = colW - CODE_W - CR_W - GR_W - 6;
  let y = startY;

  // Semester label
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000');
  t(doc, semLabel, colX, y, { width: colW });
  y += LINE_H;

  // Column header
  doc.font('Helvetica-Bold').fontSize(6.5);
  t(doc, 'Code',        colX,                            y, { width: CODE_W });
  t(doc, 'Course Name', colX + CODE_W + 2,               y, { width: NAME_W });
  t(doc, 'Cr.',         colX + CODE_W + NAME_W + 4,      y, { width: CR_W, align: 'center' });
  t(doc, 'Gr.',         colX + CODE_W + NAME_W + CR_W + 4, y, { width: GR_W, align: 'center' });
  y += 9;

  rule(doc, colX, y, colW);
  y += 4;

  // Course rows
  doc.font('Helvetica').fontSize(7).fillColor('#000');
  for (const c of courses) {
    const maxLen = Math.floor(NAME_W / 4.2);
    const name = (c.courseName || '-').length > maxLen
      ? (c.courseName || '-').slice(0, maxLen - 1) + '…'
      : (c.courseName || '-');
    t(doc, c.courseCode || '-', colX,                            y, { width: CODE_W });
    t(doc, name,                colX + CODE_W + 2,               y, { width: NAME_W });
    t(doc, String(c.credits ?? '-'), colX + CODE_W + NAME_W + 4,      y, { width: CR_W, align: 'center' });
    t(doc, c.grade || '-',      colX + CODE_W + NAME_W + CR_W + 4, y, { width: GR_W, align: 'center' });
    y += LINE_H;
  }

  // SPI line
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#000');
  t(doc, `S.P.I.: ${spiStr}`, colX, y, { width: colW, align: 'right' });
  y += LINE_H + 3;

  return y;
}

// ─── Main builder ─────────────────────────────────────────────────────────────
const buildTranscriptPDF = async (studentId) => {
  const student = await User.findById(studentId).select('-password');
  if (!student) throw new Error('Student not found');

  const profile = await StudentProfile.findOne({ user: studentId })
    .populate({ path: 'program', populate: { path: 'department', select: 'name code' } });

  const enrollments = await Enrollment.find({ student: studentId, status: 'completed' })
    .populate({ path: 'courseOffering', populate: { path: 'course', select: 'name code credits' } });

  const rollNumber  = profile?.rollNumber || student.userId;
  const programName = profile?.program?.name || 'B.Tech';
  const deptName    = profile?.program?.department?.name || student.department || 'N/A';
  const duration    = profile?.program?.duration
    ? `${profile.program.duration * 2} Semesters/${profile.program.duration} Years`
    : '8 Semesters/4 Years';
  const batch       = profile?.batch || '';
  const admDate     = batch ? `July ${batch}`
    : new Date(student.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const progStatus  = profile?.academicStatus === 'graduated' ? 'Complete' : 'Incomplete';

  // ── Group by semester ────────────────────────────────────────────────────────
  const semMap = {};
  for (const e of enrollments) {
    const co = e.courseOffering;
    if (!co) continue;
    const sem = co.semester || 'Monsoon';
    const yr  = co.year || 0;
    const key = `${semSortKey(sem, yr)}`;
    if (!semMap[key]) semMap[key] = { semester: sem, year: yr, courses: [], sortKey: semSortKey(sem, yr) };
    semMap[key].courses.push({
      courseCode:  co.course?.code || '-',
      courseName:  co.course?.name || '-',
      credits:     co.course?.credits ?? 0,
      grade:       e.grade || '-',
      gradePoints: GRADE_POINTS[e.grade] ?? null,
    });
  }
  const semesters = Object.values(semMap).sort((a, b) => a.sortKey - b.sortKey);

  // ── Compute SPI and cumulative CPI ──────────────────────────────────────────
  let cumW = 0, cumC = 0;
  const semStats = semesters.map(s => {
    let w = 0, c = 0;
    for (const co of s.courses) {
      if (co.gradePoints != null && co.credits) { w += co.gradePoints * co.credits; c += co.credits; }
    }
    const spi = c > 0 ? (w / c).toFixed(2) : 'N/A';
    cumW += w; cumC += c;
    const cpi = cumC > 0 ? (cumW / cumC).toFixed(2) : 'N/A';
    return { spi, cpi };
  });

  // ── Page constants ───────────────────────────────────────────────────────────
  const PAGE_W  = 595.28;
  const PAGE_H  = 841.89;
  const MARGIN  = 36;
  const COL_GAP = 14;
  const COL_W   = (PAGE_W - 2 * MARGIN - COL_GAP) / 2;  // ≈252.6
  const USABLE  = PAGE_W - 2 * MARGIN;
  const documentId = crypto.randomUUID();

  const pdfBase64 = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', autoFirstPage: true, margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve('data:application/pdf;base64,' + Buffer.concat(chunks).toString('base64')));
    doc.on('error', reject);

    // ── Header ───────────────────────────────────────────────────────────────
    let curY = MARGIN;
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000');
    t(doc, 'INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI', MARGIN, curY, { width: USABLE, align: 'center' });
    curY += 18;
    doc.font('Helvetica-Bold').fontSize(10);
    t(doc, `${programName} Grade Card (Provisional)`, MARGIN, curY, { width: USABLE, align: 'center' });
    curY += 14;
    rule(doc, MARGIN, curY, USABLE, '#000', 1);
    curY += 8;

    // ── Student Info ─────────────────────────────────────────────────────────
    const LBL_W = 100, VAL_W = COL_W - LBL_W - 2;
    const infoLeft = [
      ['NAME:',             student.name],
      ['ROLL NUMBER:',      rollNumber],
      ['PROGRAMME:',        programName.split(' ').slice(0, 2).join(' ')],
      ['DISCIPLINE:',       deptName],
      ['ACADEMIC DIVISION:', `Department of ${deptName}`],
    ];
    const infoRight = [
      ['DATE OF ADMISSION:', admDate],
      ['MINIMUM DURATION:',  duration],
    ];

    const RLBL_W = 100, RVAL_W = COL_W - RLBL_W - 2;
    const INFO_LX = MARGIN;
    const INFO_RX = MARGIN + COL_W + COL_GAP;
    const LINE_H  = 12;

    let leftY  = curY;
    let rightY = curY;

    for (const [lbl, val] of infoLeft) {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000');
      t(doc, lbl, INFO_LX, leftY, { width: LBL_W });
      doc.font('Helvetica');
      t(doc, val, INFO_LX + LBL_W, leftY, { width: VAL_W });
      leftY += LINE_H;
    }
    for (const [lbl, val] of infoRight) {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000');
      t(doc, lbl, INFO_RX, rightY, { width: RLBL_W });
      doc.font('Helvetica');
      t(doc, val, INFO_RX + RLBL_W, rightY, { width: RVAL_W });
      rightY += LINE_H;
    }

    // Advance past whichever column is taller
    curY = Math.max(leftY, rightY) + 6;
    rule(doc, MARGIN, curY, USABLE, '#999', 0.5);
    curY += 8;

    // ── Semester pairs ────────────────────────────────────────────────────────
    const FOOT_RESERVE = 80; // keep bottom for SPI/CPI table + footer

    for (let i = 0; i < semesters.length; i += 2) {
      const semL  = semesters[i];
      const semR  = semesters[i + 1] || null;
      const sL    = semStats[i];
      const sR    = semStats[i + 1] || null;

      const lblL = `Sem. ${ROM[i] || i + 1}: ${semL.semester} Semester of AY ${academicYear(semL.semester, semL.year)}`;
      const lblR = semR
        ? `Sem. ${ROM[i + 1] || i + 2}: ${semR.semester} Semester of AY ${academicYear(semR.semester, semR.year)}`
        : null;

      // Estimate needed height (header ≈ 35, each course ≈ 11)
      const hL = 35 + semL.courses.length * 11;
      const hR = semR ? 35 + semR.courses.length * 11 : 0;
      const needed = Math.max(hL, hR);

      if (curY + needed + FOOT_RESERVE > PAGE_H - MARGIN) {
        doc.addPage();
        curY = MARGIN + 10;
      }

      const endL = drawSemBlock(doc, MARGIN,             curY, COL_W, lblL, semL.courses, sL.spi);
      const endR = semR
        ? drawSemBlock(doc, MARGIN + COL_W + COL_GAP, curY, COL_W, lblR, semR.courses, sR.spi)
        : curY;

      curY = Math.max(endL, endR);

      // Thin divider between pairs
      rule(doc, MARGIN, curY, USABLE, '#ddd', 0.3);
      curY += 6;
    }

    // ── SPI / CPI Summary Table ───────────────────────────────────────────────
    const tableH = 55;
    if (curY + tableH + 30 > PAGE_H - MARGIN) { doc.addPage(); curY = MARGIN + 10; }

    curY += 4;
    rule(doc, MARGIN, curY, USABLE, '#000', 0.7);
    curY += 6;

    const n       = semesters.length;
    const LBL_TW  = 38;
    const STA_W   = 75;
    const CELL_W  = Math.min((USABLE - LBL_TW - STA_W) / Math.max(n, 1), 52);
    const tableW  = LBL_TW + n * CELL_W + STA_W;
    const tX      = MARGIN + (USABLE - tableW) / 2; // centre the table

    // Header row
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000');
    let hx = tX + LBL_TW;
    for (let i = 0; i < n; i++) {
      t(doc, `Sem. ${ROM[i] || i + 1}`, hx + i * CELL_W, curY, { width: CELL_W, align: 'center' });
    }
    t(doc, 'Programme Status', hx + n * CELL_W, curY, { width: STA_W, align: 'center' });
    curY += 12;

    // S.P.I. row
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000');
    t(doc, 'S.P.I.', tX, curY, { width: LBL_TW });
    doc.font('Helvetica').fillColor('#1d4ed8');
    for (let i = 0; i < n; i++) {
      t(doc, semStats[i].spi, tX + LBL_TW + i * CELL_W, curY, { width: CELL_W, align: 'center' });
    }
    curY += 12;

    // C.P.I. row
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000');
    t(doc, 'C.P.I.', tX, curY, { width: LBL_TW });
    doc.font('Helvetica').fillColor('#1d4ed8');
    for (let i = 0; i < n; i++) {
      t(doc, semStats[i].cpi, tX + LBL_TW + i * CELL_W, curY, { width: CELL_W, align: 'center' });
    }
    // Programme status in the last column
    doc.font('Helvetica-Bold').fontSize(7).fillColor(progStatus === 'Complete' ? '#16a34a' : '#b45309');
    t(doc, progStatus, tX + LBL_TW + n * CELL_W, curY, { width: STA_W, align: 'center' });
    doc.fillColor('#000');
    curY += 14;

    rule(doc, MARGIN, curY, USABLE, '#000', 0.7);

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = PAGE_H - MARGIN - 28;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
    t(doc, 'Assistant Registrar (Academic)', PAGE_W - MARGIN - 170, footerY, { width: 170, align: 'right' });
    doc.font('Helvetica').fontSize(7).fillColor('#555');
    t(doc, `Date: ${new Date().toLocaleDateString('en-IN')}`, MARGIN, footerY, { width: 150 });
    doc.font('Helvetica').fontSize(6.5).fillColor('#999');
    t(doc, `Document ID: ${documentId}  ·  Verify authenticity using this ID`, MARGIN, footerY + 12, { width: USABLE, align: 'center' });

    doc.end();
  });

  await Document.create({ documentId, student: studentId, type: 'transcript', fileData: pdfBase64 });
  return { documentId, rollNumber };
};

// ─── Exports ──────────────────────────────────────────────────────────────────
exports.generateTranscript = async (req, res) => {
  try {
    const result = await buildTranscriptPDF(req.params.studentId);
    res.status(201).json({ message: 'Transcript generated', documentId: result.documentId });
  } catch (err) {
    res.status(err.message === 'Student not found' ? 404 : 500)
      .json({ error: err.message || 'Failed to generate transcript' });
  }
};

exports.generateMyTranscript = async (req, res) => {
  try {
    const result = await buildTranscriptPDF(req.user.userId);
    res.status(201).json({ message: 'Transcript generated', documentId: result.documentId });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate transcript' });
  }
};

exports.downloadTranscript = async (req, res) => {
  try {
    const doc = await Document.findOne({ documentId: req.params.documentId })
      .populate('student', 'userId');
    if (!doc?.fileData) return res.status(404).json({ error: 'Transcript not found' });

    // Only the owning student or an admin can download. Faculty / HMC don't get
    // access to other students' transcripts via this endpoint.
    const isOwner = doc.student?._id?.toString() === req.user.userId;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to download this transcript' });
    }

    const rollNumber = doc.student?.userId || req.params.documentId;
    sendDataUrl(res, doc.fileData, `${rollNumber}_transcript.pdf`);
  } catch (err) {
    console.error('downloadTranscript:', err);
    res.status(500).json({ error: 'Failed to download transcript' });
  }
};

// Public endpoint: returns minimum proof that a document with this ID was issued.
// To get the student name back, the caller must additionally provide the
// expected roll number (?rollNumber=...) — we confirm-or-deny instead of leaking.
exports.verifyTranscript = async (req, res) => {
  try {
    const doc = await Document.findOne({ documentId: req.params.documentId })
      .select('-fileData')
      .populate('student', 'name userId');
    if (!doc) return res.json({ valid: false });

    const expectedRoll = (req.query.rollNumber || '').trim();
    if (expectedRoll) {
      const matches = doc.student?.userId === expectedRoll;
      return res.json({
        valid: matches,
        generatedAt: matches ? doc.createdAt : undefined,
        name: matches ? doc.student?.name : undefined
      });
    }
    res.json({ valid: true, generatedAt: doc.createdAt });
  } catch (err) {
    console.error('verifyTranscript:', err);
    res.status(500).json({ error: 'Failed to verify transcript' });
  }
};
