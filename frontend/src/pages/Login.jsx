import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/authService';

function genCaptcha() {
  return { a: Math.floor(Math.random() * 9) + 1, b: Math.floor(Math.random() * 9) + 1 };
}

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captcha, setCaptcha] = useState(genCaptcha);
  const [error, setError] = useState('');
  const [view, setView] = useState('welcome'); // 'welcome' | 'login'
  const [selectedRole, setSelectedRole] = useState('student');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const originalBg = document.body.style.background;
    document.body.style.background = 'url("/campus-bg.jpg") center/cover no-repeat fixed';
    
    return () => {
      document.body.style.background = originalBg;
    };
  }, []);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(genCaptcha());
    setCaptchaAnswer('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !password || !captchaAnswer) { setError('Please fill all fields'); refreshCaptcha(); return; }
    if (parseInt(captchaAnswer) !== captcha.a + captcha.b) { setError('Incorrect captcha. Try again.'); refreshCaptcha(); return; }
    try {
      const res = await login(userId, password, selectedRole);
      let dashboardPath = `/${res.role}-dashboard`;
      if (res.role === 'hmc_member') dashboardPath = '/hmc-dashboard';
      navigate(dashboardPath);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
      refreshCaptcha();
    }
  };

  const goToLogin = () => {
    setView('login');
    setError('');
    setUserId('');
    setPassword('');
    refreshCaptcha();
  };

  // Welcome screen with role selector matching the screenshot
  if (view === 'welcome') {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4">
        {/* Soft Overlay with blur */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] pointer-events-none"></div>

        <div className="bg-white rounded shadow-2xl p-10 w-full max-w-sm relative z-10 border border-gray-100">
          <div className="text-center mb-8">
            <img src="/iitg-logo.svg" alt="IIT Guwahati" className="w-20 h-20 mx-auto" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-8 text-left">Select a role</h1>

          <div className="space-y-4 mb-12">
            {['student', 'faculty', 'admin', 'hmc_member'].map((role) => (
              <label key={role} className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={() => setSelectedRole(role)}
                    className="w-5 h-5 appearance-none border border-gray-400 rounded-full checked:border-[#1a73e8] outline-none cursor-pointer"
                  />
                  {selectedRole === role && (
                    <div className="absolute w-2.5 h-2.5 bg-[#1a73e8] rounded-full pointer-events-none"></div>
                  )}
                </div>
                <span className="text-lg text-gray-800 capitalize select-none">
                  {role === 'hmc_member' ? 'HMC Member' : role}
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button 
              onClick={goToLogin}
              className="bg-[#1a73e8] hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors shadow-sm cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login form
  const roleColors = { student: '#1a73e8', faculty: '#27ae60', admin: '#e67e22', hmc_member: '#8e44ad' };
  const accentColor = roleColors[selectedRole] || '#1a73e8';
  const roleLabel = { student: 'Student', faculty: 'Faculty', admin: 'Admin', hmc_member: 'HMC Member' };
  const displayRole = roleLabel[selectedRole] || selectedRole;

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4">
      {/* Soft Overlay */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] pointer-events-none"></div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative z-10 border border-gray-100">
        <div className="text-center mb-6">
          <img src="/iitg-logo.svg" alt="IIT Guwahati" className="w-14 h-14 mx-auto mb-3" />
          <h2 className="text-[#2c3e50] font-bold text-base">IITG Affairs Portal</h2>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: accentColor + '15', color: accentColor }}>
            {displayRole} Login
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="Username" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none placeholder-gray-400" style={{ borderColor: error ? '#e74c3c' : undefined }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none placeholder-gray-400" />
          
          <div className="flex items-center space-x-2">
            <div className="bg-gray-50 border border-gray-200 text-gray-700 font-bold px-3 py-2 rounded-lg text-sm whitespace-nowrap font-mono">
              {captcha.a} + {captcha.b} = ?
            </div>
            <input value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} placeholder="Answer" className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none placeholder-gray-400 w-16" />
            <button type="button" onClick={refreshCaptcha} className="text-gray-400 hover:text-[#1a73e8] cursor-pointer text-xs p-2" title="Refresh captcha">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>

          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

          <button type="submit" className="w-full text-white font-semibold py-2.5 text-sm rounded-lg shadow-sm cursor-pointer transition-colors" style={{ backgroundColor: accentColor }}>
            Sign in as {displayRole}
          </button>
        </form>

        <div className="mt-5 flex justify-between text-xs">
          <Link to="/change-password" className="text-[#1a73e8] hover:underline">Change Password</Link>
          <Link to="/reset-password" className="text-[#e74c3c] hover:underline">Reset Password</Link>
        </div>

        <div className="mt-4 text-center">
          <button onClick={() => { setView('welcome'); setError(''); }} className="text-gray-400 text-xs hover:text-gray-600 cursor-pointer">
            ← Back to Role Selection
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-400 text-center">2026 IITG Affairs, IIT Guwahati</p>
      </div>
    </div>
  );
}
