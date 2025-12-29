import { useState } from 'react';
import { Mail, X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportName: string;
  reportData: Record<string, unknown>[];
  reportType: 'ai' | 'custom' | 'shipments';
}

export function EmailReportModal({
  isOpen,
  onClose,
  reportName,
  reportData,
  reportType
}: EmailReportModalProps) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(`${reportName} - ${new Date().toLocaleDateString()}`);
  const [message, setMessage] = useState('');
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      setStatus('error');
      return;
    }

    setSending(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase.functions.invoke('send-report-email', {
        body: {
          to: email,
          subject,
          message,
          reportName,
          reportData,
          reportType,
          format
        }
      });

      if (error) throw error;

      setStatus('sent');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setEmail('');
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('Failed to send email:', error);
      setErrorMessage('Failed to send email. Please try again later.');
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Email Report</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium text-lg text-gray-900">Email Sent!</h3>
            <p className="text-gray-500 mt-1">Report sent to {email}</p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-4">
              {status === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Send to <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a note to include with the report..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachment Format
                </label>
                <div className="flex gap-4">
                  {(['csv', 'excel'] as const).map((f) => (
                    <label
                      key={f}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="format"
                        value={f}
                        checked={format === f}
                        onChange={() => setFormat(f)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {f === 'csv' ? 'CSV' : 'Excel'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p>
                  <strong>{reportData.length}</strong> rows will be attached as a{' '}
                  {format === 'csv' ? 'CSV' : 'Excel'} file.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!email.trim() || sending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
