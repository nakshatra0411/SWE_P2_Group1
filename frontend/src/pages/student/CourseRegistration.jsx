import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import { getAvailableCourses, enrollCourse, dropCourse } from '../../services/apiService';
import api from '../../services/authService';

const GRADE_POINTS = { AA: 10, AB: 9, BB: 8, BC: 7, CC: 6, CD: 5, DD: 4, fail: 0 };
const GRADE_COLOR = { AA: 'bg-emerald-50 text-emerald-700', AB: 'bg-emerald-50 text-emerald-600', BB: 'bg-blue-50 text-blue-700', BC: 'bg-blue-50 text-blue-600', CC: 'bg-amber-50 text-amber-600', CD: 'bg-amber-50 text-amber-700', DD: 'bg-orange-50 text-orange-600', fail: 'bg-rose-50 text-rose-700' };

export default function CourseRegistration() {
  const [available, setAvailable] = useState([]);
  const [enrolled, setEnrolled] = useState([]);

  const loadData = () => {
    getAvailableCourses().then(r => setAvailable(r.data)).catch(() => {});
    api.get('/enrollment').then(r => setEnrolled(r.data)).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleEnroll = async (courseOfferingId) => {
    try {
      await enrollCourse(courseOfferingId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to enroll');
    }
  };

  const handleDrop = async (courseOfferingId) => {
    if (!confirm('Drop this course? This cannot be undone.')) return;
    try {
      await dropCourse(courseOfferingId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to drop');
    }
  };

  const active = enrolled.filter(e => e.status === 'enrolled');
  const completed = enrolled.filter(e => e.status === 'completed');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#2c3e50]">Course Registration</h1>

      {/* Active enrollments */}
      <Card>
        <h3 className="font-bold text-gray-900 mb-3">Currently Enrolled ({active.length})</h3>
        {active.length === 0 ? (
          <p className="text-gray-500 text-sm">Not enrolled in any courses this semester.</p>
        ) : (
          <div className="space-y-2">
            {active.map(e => (
              <div key={e._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{e.courseOffering?.course?.code}</span>
                  <span className="text-sm text-gray-700 ml-2">{e.courseOffering?.course?.name}</span>
                  {e.courseOffering?.faculty?.name && (
                    <span className="text-xs text-gray-400 ml-2">· {e.courseOffering.faculty.name}</span>
                  )}
                </div>
                <Button variant="danger" onClick={() => handleDrop(e.courseOffering?._id || e.courseOffering)}>Drop</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Completed with grades */}
      {completed.length > 0 && (
        <Card>
          <h3 className="font-bold text-gray-900 mb-3">Completed Courses ({completed.length})</h3>
          <div className="space-y-2">
            {completed.map(e => (
              <div key={e._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{e.courseOffering?.course?.code}</span>
                  <span className="text-sm text-gray-700 ml-2">{e.courseOffering?.course?.name}</span>
                  <span className="text-xs text-gray-400 ml-2">· {e.semester} {e.year}</span>
                </div>
                <div className="flex items-center gap-3">
                  {e.grade && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${GRADE_COLOR[e.grade] || 'bg-gray-100 text-gray-700'}`}>
                      {e.grade} · {GRADE_POINTS[e.grade] ?? '--'} pts
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Available courses */}
      <Card>
        <h3 className="font-bold text-gray-900 mb-3">Available Courses</h3>
        {available.length === 0 ? (
          <p className="text-gray-500 text-sm">No courses available for registration.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Course', 'Type', 'Instructor(s)', 'Credits', 'Seats', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {available.map(c => {
                  const typeColor = {
                    core: 'bg-blue-100 text-blue-700',
                    departmental_elective: 'bg-amber-100 text-amber-700',
                    open_elective: 'bg-emerald-100 text-emerald-700'
                  }[c.course?.type] || 'bg-gray-100 text-gray-600';
                  const typeLabel = {
                    core: 'Core',
                    departmental_elective: 'Dept. Elective',
                    open_elective: 'Open Elective'
                  }[c.course?.type] || '';
                  const instructorNames = (c.instructors?.length > 0
                    ? c.instructors.map(i => i.name)
                    : c.faculty?.name ? [c.faculty.name] : ['—']
                  ).join(', ');

                  return (
                    <tr key={c._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {c.course?.name}
                        <span className="ml-1.5 text-xs text-gray-400">({c.course?.code})</span>
                      </td>
                      <td className="px-4 py-3">
                        {typeLabel && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeColor}`}>{typeLabel}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{instructorNames}</td>
                      <td className="px-4 py-3 text-gray-600">{c.course?.credits || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.enrolled || 0}/{c.capacity || '∞'}</td>
                      <td className="px-4 py-3">
                        <Button onClick={() => handleEnroll(c._id)}>Enroll</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
