import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/authService';

export default function BonafideCertificate() {
  const { user } = useAuth();
  const [form, setForm] = useState({ semester: '', purpose: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleApply = async () => {
    if (!form.semester || !form.purpose) return alert('Please fill all fields');
    try {
      await api.post('/certificates', { type: 'bonafide', purpose: form.purpose, semester: form.semester });
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit request');
    }
  };

  const handleReset = () => {
    setForm({ semester: '', purpose: '' });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="max-w-6xl">
        <h2 className="text-2xl font-semibold mb-6 text-[#2c3e50]">Bonafide Certificate</h2>
        <div className="bg-white shadow-sm rounded-2xl p-6 border border-gray-200 text-center">
          <div className="text-emerald-600 text-4xl mb-4">✓</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
          <p className="text-gray-500 text-sm mb-6">Your bonafide certificate request has been submitted for approval.</p>
          <button onClick={handleReset} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">Submit Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-semibold mb-6 text-[#2c3e50]">Bonafide Certificate</h2>
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-gray-200">
        <p className="text-red-500 font-semibold mb-8 text-sm flex items-center">
          <span className="mr-2">This form is not for applying passport</span>
        </p>
        
        <div className="grid grid-cols-4 gap-x-6 gap-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name</label>
            <input type="text" value={user?.name || ''} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm text-gray-700" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Roll No</label>
            <input type="text" value={user?.userId || ''} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm text-gray-700" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Department</label>
            <input type="text" value={user?.department || ''} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm text-gray-700" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
            <input type="text" value={user?.email || ''} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm text-gray-700" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Current Semester</label>
            <select value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2 text-sm bg-white text-gray-900 cursor-pointer">
               <option value="">Choose..</option>
               {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Certificate For</label>
            <select value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2 text-sm bg-white text-gray-900 cursor-pointer">
               <option value="">Choose..</option>
               <option value="bank">Bank Account</option>
               <option value="visa">Visa Application</option>
               <option value="scholarship">Scholarship</option>
               <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3 justify-center mt-10">
           <button onClick={handleApply} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">Apply</button>
           <button onClick={handleReset} className="bg-amber-400 hover:bg-amber-500 text-gray-900 px-8 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">Reset</button>
        </div>
      </div>
    </div>
  );
}