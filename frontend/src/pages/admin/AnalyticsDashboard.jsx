import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import api from '../../services/authService';

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/admin/students').catch(() => ({ data: [] })),
      api.get('/admin/faculty').catch(() => ({ data: [] })),
      api.get('/admin/departments').catch(() => ({ data: [] })),
      api.get('/admin/programs').catch(() => ({ data: [] })),
      api.get('/admin/enrollments').catch(() => ({ data: [] })),
    ]).then(([students, faculty, depts, programs, enrollments]) => {
      setStats({
        students: students.data.length,
        faculty: faculty.data.length,
        departments: depts.data.length,
        programs: programs.data.length,
        enrollments: enrollments.data.length,
        activeEnrollments: enrollments.data.filter(e => e.status === 'enrolled').length,
      });
    });
  }, []);

  if (!stats) return <div className="text-gray-500 p-6">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c3e50]">Analytics Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">System-wide performance metrics.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <h2 className="text-3xl font-black text-indigo-600">{stats.students}</h2>
          <span className="text-xs font-semibold text-gray-500 uppercase">Students</span>
        </Card>
        <Card className="text-center">
          <h2 className="text-3xl font-black text-emerald-600">{stats.faculty}</h2>
          <span className="text-xs font-semibold text-gray-500 uppercase">Faculty</span>
        </Card>
        <Card className="text-center">
          <h2 className="text-3xl font-black text-amber-600">{stats.departments}</h2>
          <span className="text-xs font-semibold text-gray-500 uppercase">Departments</span>
        </Card>
        <Card className="text-center">
          <h2 className="text-3xl font-black text-purple-600">{stats.programs}</h2>
          <span className="text-xs font-semibold text-gray-500 uppercase">Programs</span>
        </Card>
        <Card className="text-center">
          <h2 className="text-3xl font-black text-sky-600">{stats.enrollments}</h2>
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Enrollments</span>
        </Card>
        <Card className="text-center">
          <h2 className="text-3xl font-black text-teal-600">{stats.activeEnrollments}</h2>
          <span className="text-xs font-semibold text-gray-500 uppercase">Active Enrollments</span>
        </Card>
      </div>
    </div>
  );
}
