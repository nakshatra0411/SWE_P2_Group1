import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import { getAcademicRecord } from '../../services/apiService';

export default function AcademicHistory() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAcademicRecord().then(r => setData(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#2c3e50]">Academic History</h1>
          <p className="text-gray-500 text-sm mt-1">Your complete semester-wise academic record.</p>
        </div>
        {data?.cgpa != null && (
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cumulative GPA</p>
            <p className="text-3xl font-black text-indigo-600">{data.cgpa}</p>
          </div>
        )}
      </div>

      {(!data || data.semesters?.length === 0) && (
        <Card><p className="text-gray-500 text-sm">No completed courses yet.</p></Card>
      )}

      {data?.semesters?.map((sem, i) => (
        <Card key={i} className="p-0 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">{sem.semester} {sem.year}</h3>
            {sem.sgpa != null && (
              <span className="text-sm font-semibold text-indigo-600">SGPA: {sem.sgpa}</span>
            )}
          </div>
          <Table
            headers={['Course Code', 'Course Name', 'Credits', 'Grade', 'Grade Points']}
            data={sem.courses}
            renderRow={(c) => (
              <>
                <td className="px-6 py-4 font-medium text-gray-900">{c.code || '--'}</td>
                <td className="px-6 py-4 text-gray-700">{c.name || '--'}</td>
                <td className="px-6 py-4">{c.credits ?? 3}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${c.grade && c.grade !== 'fail' ? 'bg-emerald-50 text-emerald-600' : c.grade === 'fail' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
                    {c.grade || 'In Progress'}
                  </span>
                </td>
                <td className="px-6 py-4">{c.gradePoints != null ? c.gradePoints.toFixed(1) : '--'}</td>
              </>
            )}
          />
        </Card>
      ))}
    </div>
  );
}
