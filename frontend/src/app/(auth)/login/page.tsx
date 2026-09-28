'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { HeartPulse, User, Stethoscope, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type RoleTab = 'PATIENT' | 'DOCTOR' | 'ADMIN';

const ROLES: { id: RoleTab; label: string; icon: React.ReactNode; color: string; hint: string; placeholder: string }[] = [
  {
    id: 'PATIENT',
    label: 'Patient',
    icon: <User className="h-4 w-4" />,
    color: 'bg-primary text-white',
    hint: 'Access your health records, view medical history, and generate your secure QR token.',
    placeholder: 'patient@email.com',
  },
  {
    id: 'DOCTOR',
    label: 'Doctor',
    icon: <Stethoscope className="h-4 w-4" />,
    color: 'bg-green-700 text-white',
    hint: 'Scan patient QR codes to start a consultation and add clinical records.',
    placeholder: 'doctor@hospital.com',
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    icon: <ShieldCheck className="h-4 w-4" />,
    color: 'bg-green-900 text-white',
    hint: 'Access k-anonymized epidemiological analytics and manage doctor accounts.',
    placeholder: 'admin@hlth01.gov',
  },
];

export default function LoginPage() {
  const [activeRole, setActiveRole] = useState<RoleTab>('PATIENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const role = ROLES.find((r) => r.id === activeRole)!;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data: any = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: activeRole }),
      });
      const user = data?.user ?? data;
      setUser(user);
      if (activeRole === 'PATIENT') router.push('/patient/dashboard');
      else if (activeRole === 'DOCTOR') router.push('/doctor/dashboard');
      else if (activeRole === 'ADMIN') router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="flex justify-center mb-5">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-green">
            <HeartPulse className="h-9 w-9 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-green-900">Welcome to HLTH01</h1>
        <p className="mt-2 text-sm text-green-600">Privacy-preserving healthcare platform</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Role Tabs */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-1 flex gap-1 mb-6">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setActiveRole(r.id); setError(''); setEmail(''); setPassword(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${activeRole === r.id
                  ? r.color + ' shadow-sm'
                  : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>

        {/* Role hint */}
        <p className="text-center text-xs text-green-600 mb-5 px-4 leading-relaxed">{role.hint}</p>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card border border-green-100 p-8">
          <h2 className="text-lg font-bold text-green-900 mb-6">
            Sign in as {role.label}
          </h2>

          {error && (
            <div className="alert-error flex items-start gap-2 mb-5">
              <span className="text-red-500 font-bold mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role.placeholder}
                className="input-field"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 hover:text-green-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-primary ${role.color}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : `Sign in as ${role.label}`}
            </button>
          </form>

          {/* Footer hint */}
          <div className="mt-6 pt-5 border-t border-green-50 text-center text-xs text-green-500">
            {activeRole === 'PATIENT' && (
              <p>New patient?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">Create account</Link>
              </p>
            )}
            {activeRole === 'DOCTOR' && (
              <p>Doctor accounts are created by your hospital administrator.</p>
            )}
            {activeRole === 'ADMIN' && (
              <p>Admin accounts are provisioned via the seed script.</p>
            )}
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">
          <p className="font-semibold mb-1">Demo credentials</p>
          <p>Admin: <span className="font-mono">admin@hlth01.gov</span> / <span className="font-mono">Admin@1234</span></p>
          <p>Doctor: <span className="font-mono">arun.mehta@hospital.com</span> / <span className="font-mono">Doctor@1234</span></p>
          <p>Patient: <span className="font-mono">rahul.verma@email.com</span> / <span className="font-mono">Patient@1234</span></p>
        </div>
      </div>
    </div>
  );
}
