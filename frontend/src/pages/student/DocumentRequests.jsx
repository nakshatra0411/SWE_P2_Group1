import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  getMyTranscriptRequests,
  createTranscriptRequest,
  generateMyTranscript,
  downloadTranscript,
} from '../../services/apiService';

const STATUS_STYLES = {
  pending:   'bg-yellow-50 text-yellow-600',
  approved:  'bg-indigo-50 text-indigo-600',
  completed: 'bg-emerald-50 text-emerald-600',
  rejected:  'bg-rose-50 text-rose-600',
};

export default function DocumentRequests() {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ purpose: '', numCopies: 1, destination: '' });
  const [downloading, setDownloading] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = () => getMyTranscriptRequests().then(r => setRequests(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleRequest = async () => {
    if (!form.purpose || !form.destination) return alert('Fill in all fields');
    try {
      await createTranscriptRequest({ ...form, numCopies: parseInt(form.numCopies) || 1 });
      setForm({ purpose: '', numCopies: 1, destination: '' });
      setShowForm(false);
      load();
    } catch { alert('Failed to submit request'); }
  };

  const handleDownload = async (documentId) => {
    setDownloading(documentId);
    try {
      const res = await downloadTranscript(documentId);
      // Use filename from Content-Disposition header (contains roll number)
      const cd = res.headers?.['content-disposition'] || '';
      const match = cd.match(/filename\*?=(?:UTF-8''|"?)([^";\n]+)/i);
      const filename = match ? decodeURIComponent(match[1].replace(/"/g, '')) : `transcript_${documentId}.pdf`;
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
    setDownloading(null);
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const res = await generateMyTranscript();
      const { documentId } = res.data;
      await handleDownload(documentId);
    } catch { alert('Failed to generate transcript'); }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#2c3e50]">Document Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Request official transcripts or download an instant copy.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleGenerateNow} disabled={generating}>
            {generating ? 'Generating...' : 'Download My Transcript'}
          </Button>
          <Button onClick={() => setShowForm(v => !v)}>+ New Official Request</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <h3 className="font-bold text-gray-900 mb-4">Official Transcript Request</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Purpose</label>
              <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Higher studies application"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Destination / Institution</label>
              <input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}
                placeholder="e.g. MIT, Harvard"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Number of Copies</label>
              <input type="number" min={1} max={10} value={form.numCopies}
                onChange={e => setForm({ ...form, numCopies: e.target.value })}
                className="w-32 border border-gray-200 rounded-xl px-4 py-2 text-gray-900" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={handleRequest}>Submit Request</Button>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-bold text-gray-900 mb-4">My Requests</h3>
        {requests.length === 0 ? (
          <p className="text-gray-500 text-sm">No requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req._id} className="flex justify-between items-start p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{req.purpose}</p>
                  <p className="text-xs text-gray-500">To: {req.destination} &nbsp;|&nbsp; Copies: {req.numCopies}</p>
                  <p className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</p>
                  {req.remarks && <p className="text-xs text-gray-500 italic">Remarks: {req.remarks}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[140px] text-right">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-500'}`}>
                    {req.status}
                  </span>
                  {req.status === 'completed' && req.documentId && (
                    <button
                      onClick={() => handleDownload(req.documentId)}
                      disabled={downloading === req.documentId}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      {downloading === req.documentId ? 'Downloading...' : 'Download PDF'}
                    </button>
                  )}
                  {req.status === 'completed' && !req.documentId && (
                    <div className="flex items-start gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-left max-w-[200px]">
                      <svg className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-xs text-emerald-700 font-medium leading-snug">
                        {req.remarks ? req.remarks : 'Ready for pickup at Academic Section'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
