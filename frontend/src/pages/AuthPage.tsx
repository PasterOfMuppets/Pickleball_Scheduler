import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    smsConsent: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await authLogin(formData.email, formData.password);
        navigate('/');
      } else if (mode === 'signup') {
        // Register new user
        await axios.post(`${API_URL}/api/auth/register`, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          sms_consent: formData.smsConsent,
        });
        // Auto-login after registration
        await authLogin(formData.email, formData.password);
        navigate('/');
      } else if (mode === 'reset') {
        // Password reset
        await axios.post(`${API_URL}/api/auth/request-password-reset`, {
          email: formData.email,
        });
        setResetSent(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeWidth="2" d="M8 12h8M12 8v8" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold">Pickleball League</h1>
            <p className="text-slate-500 mt-1">
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {resetSent && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm text-emerald-800">
                Password reset link sent! Check your email.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="flex items-start space-x-2 p-4 bg-slate-50 rounded-lg">
                <Checkbox
                  id="sms-consent"
                  checked={formData.smsConsent}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, smsConsent: checked as boolean })
                  }
                />
                <label htmlFor="sms-consent" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                  I consent to receive SMS notifications for match updates and scheduling
                </label>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Link'}
                </>
              )}
            </Button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => {
                    setMode('reset');
                    setError('');
                    setResetSent(false);
                  }}
                  className="text-emerald-600 hover:underline"
                  type="button"
                >
                  Forgot password?
                </button>
                <div className="mt-2">
                  <span className="text-slate-500">Don't have an account? </span>
                  <button
                    onClick={() => {
                      setMode('signup');
                      setError('');
                    }}
                    className="text-emerald-600 hover:underline"
                    type="button"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}
            {mode === 'signup' && (
              <div>
                <span className="text-slate-500">Already have an account? </span>
                <button
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-emerald-600 hover:underline"
                  type="button"
                >
                  Sign in
                </button>
              </div>
            )}
            {mode === 'reset' && (
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                  setResetSent(false);
                }}
                className="text-emerald-600 hover:underline"
                type="button"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Organized, professional scheduling for casual players
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
