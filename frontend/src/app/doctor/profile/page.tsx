'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { Stethoscope, CheckCircle2, AlertCircle } from 'lucide-react';

interface DoctorProfile {
  name: string;
  email: string;
  licenseNumber: string;
  hospitalName: string;
  specialization: string;
}

const SPECIALIZATIONS = [
  'General Practitioner',
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'Neurology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Urology',
  'Infectious Disease Specialist',
  'Other',
];

export default function DoctorProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<DoctorProfile>({
    name: '',
    email: '',
    licenseNumber: '',
    hospitalName: '',
    specialization: '',
  });

  const [form, setForm] = useState({
    licenseNumber: '',
    hospitalName: '',
    specialization: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data: any = await apiFetch('/doctor/profile');
        const u = data?.user ?? data;
        setProfile(u);
        setForm({
          licenseNumber: u.licenseNumber ?? '',
          hospitalName: u.hospitalName ?? '',
          specialization: u.specialization ?? '',
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data: any = await apiFetch('/doctor/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      });

      const u = data?.user ?? data;
      setProfile(u);
      setSuccess('Profile updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-green-900">Doctor Profile</h1>
        <p className="mt-1 text-sm text-green-600">
          Manage your verified credentials and clinical practice details.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Banner with Doctor details */}
        <div className="bg-gradient-to-r from-primary to-primary-700 px-6 py-8 flex items-center gap-5">
          <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold select-none shadow-sm">
            {profile.name ? profile.name.replace('Dr. ', '').charAt(0).toUpperCase() : 'D'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white text-xl font-bold">{profile.name || user?.name || '—'}</p>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold">
                Verified Doctor
              </span>
            </div>
            <p className="text-green-100 text-sm mt-0.5">{profile.email || user?.email || '—'}</p>
          </div>
        </div>

        {/* Read-only account overview */}
        <div className="px-6 pt-6 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label text-xs uppercase tracking-wide">
              Full Legal Name
            </label>
            <div className="text-sm font-medium text-green-900 bg-green-50/50 rounded-xl px-4 py-2.5 border border-green-100">
              {profile.name || '—'}
            </div>
          </div>
          <div>
            <label className="label text-xs uppercase tracking-wide">
              Registered Email
            </label>
            <div className="text-sm font-medium text-green-900 bg-green-50/50 rounded-xl px-4 py-2.5 border border-green-100">
              {profile.email || '—'}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
          <hr className="border-green-100" />

          {/* Feedback messages */}
          {error && (
            <div className="alert-error flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="alert-success flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* License Number */}
          <div>
            <label htmlFor="licenseNumber" className="label">
              Medical License Number <span className="text-red-500">*</span>
            </label>
            <input
              id="licenseNumber"
              name="licenseNumber"
              type="text"
              required
              value={form.licenseNumber}
              onChange={handleChange}
              placeholder="e.g. MH-2019-4521"
              className="input-field"
            />
          </div>

          {/* Hospital Name */}
          <div>
            <label htmlFor="hospitalName" className="label">
              Hospital / Clinic Affiliation <span className="text-red-500">*</span>
            </label>
            <input
              id="hospitalName"
              name="hospitalName"
              type="text"
              required
              value={form.hospitalName}
              onChange={handleChange}
              placeholder="e.g. Apollo Hospital, Mumbai"
              className="input-field"
            />
          </div>

          {/* Specialization */}
          <div>
            <label htmlFor="specialization" className="label">
              Clinical Specialization <span className="text-red-500">*</span>
            </label>
            <select
              id="specialization"
              name="specialization"
              required
              value={form.specialization}
              onChange={handleChange}
              className="input-field bg-white"
            >
              <option value="" disabled>
                Select specialization…
              </option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-3 pb-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-8"
            >
              {saving && (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              )}
              {saving ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
