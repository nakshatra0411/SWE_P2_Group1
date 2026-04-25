import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getAnnouncements, getMyAssignments } from '../../services/apiService';
import api from '../../services/authService';

const GRADE_COLOR = { AA: 'text-emerald-600', AB: 'text-emerald-500', BB: 'text-blue-600', BC: 'text-blue-500', CC: 'text-amber-500', CD: 'text-amber-600', DD: 'text-orange-500', fail: 'text-rose-600' };

export default function StudentDashboard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    getAnnouncements().then(r => setAnnouncements(r.data.slice(0, 3))).catch(() => {});
    getMyAssignments().then(r => setAssignments(r.data)).catch(() => {});
    api.get('/enrollment').then(r => setEnrollments(r.data)).catch(() => {});
  }, []);

  const activeEnrollments = enrollments.filter(e => e.status === 'enrolled');
  // An assignment is truly pending only if deadline hasn't passed AND student hasn't submitted yet
  const pendingAssignments = assignments.filter(a => new Date(a.deadline) > new Date() && !a.mySubmission);
  const pendingCount = pendingAssignments.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c3e50]">Welcome back, {user?.name || 'Student'}</h1>
        <p className="text-gray-500 text-sm mt-1">Here's your academic overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col justify-center items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900">{activeEnrollments.length}</h2>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Enrolled Courses</span>
        </Card>

        <Card className="flex flex-col justify-center items-center text-center space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full z-0" />
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2 z-10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 z-10">{pendingCount}</h2>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider z-10">Pending Assignments</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Courses */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">My Courses</h3>
          {enrollments.length === 0 ? (
            <p className="text-gray-500 text-sm">No enrolled courses.</p>
          ) : (
            <div className="space-y-2">
              {enrollments.map(e => (
                <div key={e._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.courseOffering?.course?.code} — {e.courseOffering?.course?.name}</p>
                    <p className="text-xs text-gray-400">{e.courseOffering?.faculty?.name || '—'}</p>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    {e.grade ? (
                      <span className={`text-sm font-bold ${GRADE_COLOR[e.grade] || 'text-gray-700'}`}>{e.grade}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Upcoming Deadlines</h3>
          <div className="space-y-3">
            {pendingAssignments.slice(0, 4).map((a, i) => (
              <div key={a._id || i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{a.courseOffering?.course?.code} · Due: {new Date(a.deadline).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-bold text-rose-600 flex-shrink-0 ml-2">
                  {Math.ceil((new Date(a.deadline) - new Date()) / 86400000)}d
                </span>
              </div>
            ))}
            {pendingAssignments.length === 0 && (
              <p className="text-gray-500 text-sm">No upcoming deadlines.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Announcements</h3>
          <div className="space-y-3">
            {announcements.map((a, i) => (
              <div key={a._id || i} className="p-3 bg-gray-50 rounded-xl border-l-4 border-l-indigo-500 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{a.content?.slice(0, 120)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
