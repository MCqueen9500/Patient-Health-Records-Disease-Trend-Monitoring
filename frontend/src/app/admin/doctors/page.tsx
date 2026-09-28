'use client';

import { useEffect, useState, useCallback } from 'react';
import { UserPlus, RefreshCw, CheckCircle2, Clock, ToggleLeft, ToggleRight, Stethoscope, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
  _id: string;
  name: string;
  email: string;
  licenseNumber: string;
  hospitalName: string;
  specialization: string;
  isApproved: boolean;
}

interface DoctorForm {
  name: string;
  email: string;
  password: string;
  licenseNumber: string;
  hospitalName: string;
  specialization: string;
}

const EMPTY_FORM: DoctorForm = {
  name: '',
  email: '',
  password: '',
  licenseNumber: '',
  hospitalName: '',
  specialization: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  id: keyof DoctorForm;
  type?: string;
  value: string;
  onChange: (k: keyof DoctorForm, v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="input-field"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDoctorsPage() {
  const [form, setForm] = useState<DoctorForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Fetch doctors ──────────────────────────────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    setLoadingList(true);
    try {
      const data: any = await apiFetch('/admin/doctors');
      setDoctors(data?.doctors ?? data ?? []);
    } catch {
      setDoctors([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const handleChange = (key: keyof DoctorForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formError) setFormError('');
    if (formSuccess) setFormSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const missing = (Object.keys(EMPTY_FORM) as (keyof DoctorForm)[]).find(
      (k) => !form[k].trim()
    );
    if (missing) {
      setFormError(`Please fill in the ${missing} field.`);
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/admin/doctors', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      setFormSuccess('Doctor credential profile registered successfully!');
      setForm(EMPTY_FORM);
      fetchDoctors();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An error occurred registering the doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const data: any = await apiFetch(`/admin/doctors/${id}/toggle-approval`, {
        method: 'PATCH',
      });
      const updated: Doctor = data?.doctor ?? data;
      setDoctors((prev) =>
        prev.map((d) => (d._id === id ? { ...d, isApproved: updated.isApproved ?? !d.isApproved } : d))
      );
    } catch {
      // silently handle
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-green-950">Doctor Credential Management</h1>
        <p className="text-green-600 mt-1 text-sm">
          Register licensed clinical practitioners and audit platform practice permissions
        </p>
      </div>

      {/* ── Section 1: Register Form ──────────────────────────────────────── */}
      <section className="card space-y-5">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-green-950">Register New Clinical Practitioner</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              label="Full Legal Name"
              id="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Dr. Arun Mehta"
              required
            />
            <FormField
              label="Official Email"
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="doctor@hospital.com"
              required
            />
            <FormField
              label="Initial Password"
              id="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min 8 characters"
              required
            />
            <FormField
              label="Medical License #"
              id="licenseNumber"
              value={form.licenseNumber}
              onChange={handleChange}
              placeholder="e.g. MCI-2021-9988"
              required
            />
            <FormField
              label="Hospital / Health Facility"
              id="hospitalName"
              value={form.hospitalName}
              onChange={handleChange}
              placeholder="e.g. AIIMS New Delhi"
              required
            />
            <FormField
              label="Clinical Specialization"
              id="specialization"
              value={form.specialization}
              onChange={handleChange}
              placeholder="e.g. Pulmonologist"
              required
            />
          </div>

          {/* Feedback Messages */}
          {formError && (
            <div className="alert-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="alert-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Registering Practitioner…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register Doctor
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setForm(EMPTY_FORM); setFormError(''); setFormSuccess(''); }}
              className="btn-outline"
            >
              Clear Fields
            </button>
          </div>
        </form>
      </section>

      {/* ── Section 2: Doctors Table ──────────────────────────────────────── */}
      <section className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-green-100 flex items-center justify-between bg-green-50/40">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-green-950">Practitioner Directory</h2>
            {!loadingList && (
              <span className="badge-green ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {doctors.length} Doctors
              </span>
            )}
          </div>
          <button
            onClick={fetchDoctors}
            disabled={loadingList}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-primary transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
            Refresh List
          </button>
        </div>

        {loadingList ? (
          <div className="animate-pulse divide-y divide-green-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 px-6 py-4">
                <div className="h-4 bg-green-100 rounded flex-1" />
                <div className="h-4 bg-green-100 rounded w-40" />
                <div className="h-4 bg-green-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center text-green-600 text-sm">
            No doctors registered in the database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-green-50/70 border-b border-green-100">
                  {[
                    'Doctor Name',
                    'Email Address',
                    'License #',
                    'Hospital / Clinic',
                    'Specialization',
                    'Platform Status',
                    'Authorization Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-bold text-green-800 uppercase tracking-wider px-5 py-3.5 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {doctors.map((doctor) => (
                  <tr
                    key={doctor._id}
                    className="hover:bg-green-50/50 transition-colors"
                  >
                    <td className="px-5 py-4 font-bold text-green-950 whitespace-nowrap">
                      {doctor.name}
                    </td>
                    <td className="px-5 py-4 text-green-700 whitespace-nowrap">{doctor.email}</td>
                    <td className="px-5 py-4 text-green-900 font-mono text-xs whitespace-nowrap">
                      {doctor.licenseNumber}
                    </td>
                    <td className="px-5 py-4 text-green-700 whitespace-nowrap">{doctor.hospitalName}</td>
                    <td className="px-5 py-4 text-green-800 font-medium whitespace-nowrap">{doctor.specialization}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {doctor.isApproved ? (
                        <span className="badge-green inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          Approved
                        </span>
                      ) : (
                        <span className="badge-amber inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggle(doctor._id)}
                        disabled={togglingId === doctor._id}
                        title={doctor.isApproved ? 'Revoke doctor access' : 'Grant doctor access'}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 ${
                          doctor.isApproved
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            : 'btn-primary py-1 px-3 text-xs'
                        }`}
                      >
                        {togglingId === doctor._id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : doctor.isApproved ? (
                          <ToggleRight className="w-4 h-4 text-red-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-white" />
                        )}
                        {doctor.isApproved ? 'Revoke Access' : 'Authorize Doctor'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
