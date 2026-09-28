'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface Medicine {
  name: string;
  dosage: string;
  quantity: number | '';
  frequency: string;
  price: number | '';
}

interface MedicalRecord {
  _id: string;
  diagnosis: string;
  diseaseCategory: string;
  symptoms: string[];
  consultationFee: number;
  medicines: Medicine[];
  createdAt: string;
  doctorName?: string;
  hospitalName?: string;
}

interface PatientData {
  _id: string;
  name: string;
  address: string;
  pincode: string;
  records: MedicalRecord[];
}

const DISEASE_CATEGORIES = [
  'Infectious',
  'Respiratory',
  'Vector-borne',
  'Waterborne',
  'Chronic',
] as const;


const emptyMedicine = (): Medicine => ({
  name: '',
  dosage: '',
  quantity: '',
  frequency: '',
  price: '',
});


// ── Helper: status badge colour ────────────────────────────────────────────

function categoryBadge(category: string) {
  const map: Record<string, string> = {
    Infectious: 'bg-yellow-100 text-yellow-800',
    Respiratory: 'bg-sky-100 text-sky-800',
    'Vector-borne': 'bg-orange-100 text-orange-800',
    Waterborne: 'bg-teal-100 text-teal-800',
    Chronic: 'bg-purple-100 text-purple-800',
  };
  return map[category] ?? 'bg-gray-100 text-gray-700';
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PatientViewPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const patientId = params.id;
  const sessionToken = searchParams.get('session') ?? '';

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Form state ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    diagnosis: '',
    diseaseCategory: '' as (typeof DISEASE_CATEGORIES)[number] | '',
    symptoms: '',
    consultationFee: '' as number | '',
  });
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // ── Fetch patient ──────────────────────────────────────────────────────
  const fetchPatient = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      // apiFetch auto-throws on non-2xx with the server's error message
      const data: any = await apiFetch(
        `/doctor/patient/${patientId}?session=${encodeURIComponent(sessionToken)}`
      );

      // Backend returns { patient: {...}, records: [...] }
      const p = data.patient ?? data;
      setPatient({
        _id: p._id,
        name: p.name,
        address: p.residentialAddress ?? '',
        pincode: p.pincode ?? '',
        records: (data.records ?? []).map((r: any) => ({
          ...r,
          doctorName: r.doctorId?.name ?? '',
          hospitalName: r.doctorId?.hospitalName ?? '',
        })),
      });
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [patientId, sessionToken]);

  useEffect(() => {
    if (!sessionToken) {
      setLoadError('No session token found. Please scan the QR again.');
      setLoading(false);
      return;
    }
    fetchPatient();
  }, [fetchPatient, sessionToken]);

  // ── Form field helpers ─────────────────────────────────────────────────
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'consultationFee' ? (value === '' ? '' : Number(value)) : value,
    }));
    setFormError('');
    setFormSuccess('');
  };

  const handleMedicineChange = (
    idx: number,
    field: keyof Medicine,
    value: string
  ) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        [field]:
          field === 'quantity' || field === 'price'
            ? value === ''
              ? ''
              : Number(value)
            : value,
      };
      return updated;
    });
  };

  const addMedicine = () => setMedicines((prev) => [...prev, emptyMedicine()]);

  const removeMedicine = (idx: number) =>
    setMedicines((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit new record ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Basic validation
    if (!form.diagnosis.trim()) {
      setFormError('Diagnosis is required.');
      return;
    }
    if (!form.diseaseCategory) {
      setFormError('Please select a disease category.');
      return;
    }

    const symptomsArray = form.symptoms
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (symptomsArray.length === 0) {
      setFormError('Enter at least one symptom.');
      return;
    }

    // Validate medicines
    for (let i = 0; i < medicines.length; i += 1) {
      const med = medicines[i];
      if (!med.name.trim()) {
        setFormError(`Medicine ${i + 1}: name is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        diagnosis: form.diagnosis.trim(),
        diseaseCategory: form.diseaseCategory,
        symptoms: symptomsArray,
        consultationFee: Number(form.consultationFee) || 0,
        medicines: medicines.map((m) => ({
          ...m,
          quantity: Number(m.quantity) || 0,
          price: Number(m.price) || 0,
        })),
      };

      await apiFetch(
        `/doctor/patient/${patientId}/record?session=${encodeURIComponent(sessionToken)}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      setFormSuccess('Medical record saved successfully!');
      // Reset form
      setForm({ diagnosis: '', diseaseCategory: '', symptoms: '', consultationFee: '' });
      setMedicines([emptyMedicine()]);
      // Refresh history
      await fetchPatient();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / error screens ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-500">Loading patient data…</p>
      </div>
    );
  }

  if (loadError || !patient) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-red-800">Session Error</h2>
          <p className="text-sm text-red-700">{loadError || 'Patient not found.'}</p>
          <Link
            href="/doctor/dashboard"
            className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Section 1: Patient Info Card ─────────────────────────────────── */}
      <div className="bg-white border border-green-100 shadow-card rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-primary text-2xl font-bold select-none flex-shrink-0">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-green-900">{patient.name}</h2>
            <p className="text-xs text-green-600 uppercase tracking-wide font-semibold mt-0.5">Patient</p>
          </div>
          <span className="badge badge-green">Active Session</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Address</p>
            <p className="text-sm text-green-900">{patient.address || '—'}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Pincode</p>
            <p className="text-sm text-green-900">{patient.pincode || '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Medical History ────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-green-100 bg-green-50/40">
          <h3 className="text-lg font-bold text-green-950">Medical History</h3>
          <p className="text-xs text-green-600 mt-0.5">
            {patient.records.length} record{patient.records.length !== 1 ? 's' : ''} on file
          </p>
        </div>

        {patient.records.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-green-600">
            No previous medical records on file.
          </div>
        ) : (
          <div className="divide-y divide-green-50 max-h-[480px] overflow-y-auto">
            {[...patient.records]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
              .map((record) => (
                <div key={record._id} className="px-6 py-5 hover:bg-green-50/40 transition-colors">
                  {/* Row 1: diagnosis + category + date */}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-green-950">{record.diagnosis}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${categoryBadge(
                          record.diseaseCategory
                        )}`}
                      >
                        {record.diseaseCategory}
                      </span>
                    </div>
                    <span className="text-xs text-green-600 whitespace-nowrap">
                      {formatDate(record.createdAt)}
                    </span>
                  </div>

                  {/* Row 2: symptoms */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {record.symptoms.map((sym, i) => (
                      <span
                        key={i}
                        className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>

                  {/* Row 3: fee + doctor */}
                  <div className="flex flex-wrap gap-4 text-xs text-green-700">
                    <span>
                      💰 Consultation fee:{' '}
                      <span className="font-bold text-green-900">
                        ₹{record.consultationFee}
                      </span>
                    </span>
                    {record.doctorName && (
                      <span>
                        🩺 Dr. {record.doctorName}
                        {record.hospitalName && ` · ${record.hospitalName}`}
                      </span>
                    )}
                  </div>

                  {/* Row 4: medicines */}
                  {record.medicines?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">
                        Medicines Prescribed
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {record.medicines.map((med, mi) => (
                          <div
                            key={mi}
                            className="text-xs bg-green-50 border border-green-200 text-green-900 px-3 py-1 rounded-xl"
                          >
                            <span className="font-bold text-green-950">{med.name}</span>
                            {med.dosage && ` · ${med.dosage}`}
                            {med.frequency && ` · ${med.frequency}`}
                            {med.quantity ? ` · Qty: ${med.quantity}` : ''}
                            {med.price ? ` · ₹${med.price}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Section 3: New Medical Record Form ───────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-green-100 bg-green-50/40">
          <h3 className="text-lg font-bold text-green-950">Add New Medical Record</h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Alerts */}
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {formSuccess}
            </div>
          )}

          {/* Diagnosis */}
          <div>
            <label
              htmlFor="diagnosis"
              className="label"
            >
              Diagnosis <span className="text-red-500">*</span>
            </label>
            <input
              id="diagnosis"
              name="diagnosis"
              type="text"
              required
              value={form.diagnosis}
              onChange={handleFormChange}
              placeholder="e.g. Type 2 Diabetes Mellitus"
              className="input-field"
            />
          </div>

          {/* Disease Category */}
          <div>
            <label
              htmlFor="diseaseCategory"
              className="label"
            >
              Disease Category <span className="text-red-500">*</span>
            </label>
            <select
              id="diseaseCategory"
              name="diseaseCategory"
              required
              value={form.diseaseCategory}
              onChange={handleFormChange}
              className="input-field bg-white"
            >
              <option value="" disabled>
                Select category…
              </option>
              {DISEASE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Symptoms */}
          <div>
            <label
              htmlFor="symptoms"
              className="label"
            >
              Symptoms{' '}
              <span className="text-xs text-green-500 font-normal">
                (comma-separated)
              </span>{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="symptoms"
              name="symptoms"
              type="text"
              required
              value={form.symptoms}
              onChange={handleFormChange}
              placeholder="e.g. fatigue, frequent urination, blurred vision"
              className="input-field"
            />
          </div>

          {/* Consultation Fee */}
          <div>
            <label
              htmlFor="consultationFee"
              className="label"
            >
              Consultation Fee (₹)
            </label>
            <input
              id="consultationFee"
              name="consultationFee"
              type="number"
              min={0}
              step={1}
              value={form.consultationFee}
              onChange={handleFormChange}
              placeholder="e.g. 500"
              className="input-field"
            />
          </div>

          {/* Medicines Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">
                Medicines
              </label>
              <button
                type="button"
                onClick={addMedicine}
                className="text-sm font-semibold text-primary hover:text-green-800 flex items-center gap-1 transition-colors"
              >
                <span className="text-base leading-none">+</span> Add Medicine
              </button>
            </div>

            <div className="space-y-4">
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl border border-green-200 bg-green-50 p-4"
                >
                  {/* Remove button */}
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicine(idx)}
                      className="absolute top-3 right-3 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                    >
                      Remove
                    </button>
                  )}

                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">
                    Medicine {idx + 1}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-medium text-green-800 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={med.name}
                        onChange={(e) =>
                          handleMedicineChange(idx, 'name', e.target.value)
                        }
                        placeholder="e.g. Metformin"
                        className="input-field bg-white py-1.5 px-3"
                      />
                    </div>

                    {/* Dosage */}
                    <div>
                      <label className="block text-xs font-medium text-green-800 mb-1">
                        Dosage
                      </label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) =>
                          handleMedicineChange(idx, 'dosage', e.target.value)
                        }
                        placeholder="e.g. 500 mg"
                        className="input-field bg-white py-1.5 px-3"
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-xs font-medium text-green-800 mb-1">
                        Frequency
                      </label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) =>
                          handleMedicineChange(idx, 'frequency', e.target.value)
                        }
                        placeholder="e.g. Twice daily"
                        className="input-field bg-white py-1.5 px-3"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-green-800 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={med.quantity}
                        onChange={(e) =>
                          handleMedicineChange(idx, 'quantity', e.target.value)
                        }
                        placeholder="e.g. 30"
                        className="input-field bg-white py-1.5 px-3"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-xs font-medium text-green-800 mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={med.price}
                        onChange={(e) =>
                          handleMedicineChange(idx, 'price', e.target.value)
                        }
                        placeholder="e.g. 120"
                        className="input-field bg-white py-1.5 px-3"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting && (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              )}
              {submitting ? 'Saving…' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
