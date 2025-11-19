import { useState } from 'react';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { usePickleballStore } from '../store/usePickleballStore';

export function AuthFlow() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    smsConsent: false,
  });

  const { login, signup } = usePickleballStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      login(formData.email, formData.password);
    } else if (mode === 'signup') {
      signup({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        smsConsent: formData.smsConsent,
      });
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
            <h1>Pickleball League</h1>
            <p className="text-slate-500 mt-1">
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </p>
          </div>

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
                <label htmlFor="sms-consent" className="text-sm text-slate-600 leading-relaxed">
                  I consent to receive SMS notifications for match updates and scheduling
                </label>
              </div>
            )}

            <Button type="submit" className="w-full">
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'reset' && 'Send Reset Link'}
            </Button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => setMode('reset')}
                  className="text-emerald-600 hover:underline"
                >
                  Forgot password?
                </button>
                <div className="mt-2">
                  <span className="text-slate-500">Don't have an account? </span>
                  <button
                    onClick={() => setMode('signup')}
                    className="text-emerald-600 hover:underline"
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
                  onClick={() => setMode('login')}
                  className="text-emerald-600 hover:underline"
                >
                  Sign in
                </button>
              </div>
            )}
            {mode === 'reset' && (
              <button
                onClick={() => setMode('login')}
                className="text-emerald-600 hover:underline"
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
