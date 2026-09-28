'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Medicine {
  name: string;
  dosage: string;
}

interface MedicalRecord {
  _id: string;
  visitDate: string;
  diagnosis: string;
  diseaseCategory: string;
  doctorName: string;
  hospitalName: string;
  symptoms: string[];
  medicines: Medicine[];
  consultationFee: number;
}

interface AuditLog {
  _id: string;
  doctorName: string;
  hospitalName: string;
  action: string;
  timestamp: string;
}

interface QrTokenResponse {
  token: string;
}

// ─── Disease Category Badge Colors ───────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  Infectious:
    'bg-red-100 text-red-700 border border-red-200',
  Respiratory:
    'bg-blue-100 text-blue-700 border border-blue-200',
  'Vector-borne':
    'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Waterborne:
    'bg-cyan-100 text-cyan-700 border border-cyan-200',
  Chronic:
    'bg-purple-100 text-purple-700 border border-purple-200',
};

function categoryStyle(category: string): string {
  return (
    CATEGORY_STYLES[category] ??
    'bg-gray-100 text-gray-700 border border-gray-200'
  );
}

// ─── QR Section ──────────────────────────────────────────────────────────────

const QR_TTL = 120; // seconds

function QrSection() {
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startCountdown = useCallback(() => {
    clearTimer();
    setSecondsLeft(QR_TTL);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearTimer(), []);

  const generateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: QrTokenResponse = await apiFetch('/patient/qr-token');
      setToken(data.token);
      startCountdown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = token !== null && secondsLeft === 0;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdownLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <Card className="overflow-hidden shadow-green">
      <div className="bg-gradient-to-br from-primary to-primary-700 px-6 py-5">
        <h2 className="text-xl font-bold text-white">Patient QR Token</h2>
        <p className="text-green-100 text-sm mt-1">
          Share this QR code with your doctor to grant access to your records.
        </p>
      </div>

      <CardContent className="flex flex-col items-center gap-6 py-8">
        {error && (
          <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-4 py-2 w-full text-center">
            {error}
          </p>
        )}

        {token && !isExpired ? (
          <>
            <div className="p-4 bg-white rounded-2xl shadow-card border border-green-100">
              <QRCodeSVG
                value={token}
                size={220}
                bgColor="#ffffff"
                fgColor="#14532d"
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Countdown */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-mono font-bold text-primary tracking-widest">
                {countdownLabel}
              </span>
              <span className="text-green-500 text-xs uppercase tracking-wide">
                Time remaining
              </span>

              {/* Progress bar */}
              <div className="w-56 h-2 bg-green-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${(secondsLeft / QR_TTL) * 100}%` }}
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={generateToken}
              disabled={loading}
              className="border-primary text-primary hover:bg-primary-50"
            >
              Regenerate Token
            </Button>
          </>
        ) : isExpired ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center border-2 border-red-200">
              <svg
                className="w-10 h-10 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-red-600 font-semibold text-lg">Token Expired</p>
            <p className="text-green-600 text-sm">
              Your QR token has expired. Generate a new one.
            </p>
            <button onClick={generateToken} disabled={loading} className="btn-primary">
              {loading ? 'Generating…' : 'Generate New Token'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center border-2 border-green-200">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.243m-6.243 0H6m6 6h.01M6 12h.01M6 6h.01M18 6h.01M6 18h.01M18 18h.01"
                />
              </svg>
            </div>
            <p className="text-green-600 text-sm text-center max-w-xs">
              Click the button below to generate a one-time QR code valid for 2
              minutes.
            </p>
            <button
              onClick={generateToken}
              disabled={loading}
              className="btn-primary px-8"
            >
              {loading ? 'Generating…' : 'Generate QR Token'}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Medical History Section ──────────────────────────────────────────────────

function MedicalHistorySection() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/patient/history')
      .then((data: any) => {
        const records = data?.records ?? data ?? [];
        setRecords(records.map((r: any) => ({
          ...r,
          doctorName: r.doctorId?.name ?? 'Unknown Doctor',
          hospitalName: r.doctorId?.hospitalName ?? '',
        })));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load records')
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="shadow-card">
      <CardHeader className="border-b border-green-100 pb-4">
        <CardTitle className="text-green-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Medical History Timeline
        </CardTitle>
      </CardHeader>

      <CardContent className="py-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-200 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <p className="alert-error">{error}</p>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center py-12 text-green-300 gap-3">
            <svg
              className="w-14 h-14"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="font-medium text-base text-green-500">No medical records found</p>
            <p className="text-sm text-green-400">
              Your health history will appear here after a doctor visits.
            </p>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <ol className="relative border-l-2 border-green-200 ml-4 space-y-8">
            {records.map((rec) => (
              <li key={rec._id} className="ml-6">
                {/* Timeline dot */}
                <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-primary ring-4 ring-white">
                  <span className="w-2 h-2 rounded-full bg-white" />
                </span>

                <div className="bg-white border border-green-100 rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow">
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs text-green-500 font-medium uppercase tracking-wide">
                        {formatDate(rec.visitDate)}
                      </p>
                      <p className="text-lg font-bold text-green-900 mt-0.5">
                        {rec.diagnosis}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryStyle(
                        rec.diseaseCategory
                      )}`}
                    >
                      {rec.diseaseCategory}
                    </span>
                  </div>

                  {/* Doctor & Hospital */}
                  <div className="flex flex-wrap gap-4 text-sm text-green-700 mb-3">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Dr. {rec.doctorName}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      {rec.hospitalName}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      ₹{rec.consultationFee.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Symptoms */}
                  {rec.symptoms.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">
                        Symptoms
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.symptoms.map((s, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medicines */}
                  {rec.medicines.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">
                        Medicines Prescribed
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {rec.medicines.map((m, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 px-3 py-1 bg-green-50 border border-green-200 rounded-lg text-xs"
                          >
                            <span className="font-semibold text-green-800">
                              {m.name}
                            </span>
                            <span className="text-green-400">·</span>
                            <span className="text-green-600">{m.dosage}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Audit Log Section ────────────────────────────────────────────────────────

function AuditLogSection() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/patient/audit-logs')
      .then((data: any) => {
        const logs = data?.logs ?? data ?? [];
        setLogs(logs.map((l: any) => ({
          ...l,
          doctorName: l.doctorId?.name ?? 'Unknown Doctor',
          hospitalName: l.doctorId?.hospitalName ?? '',
        })));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load logs')
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="shadow-card">
      <CardHeader className="border-b border-green-100 pb-4">
        <CardTitle className="text-green-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Access Audit Log
        </CardTitle>
      </CardHeader>

      <CardContent className="py-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-200 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <p className="alert-error">{error}</p>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="flex flex-col items-center py-12 text-green-300 gap-3">
            <svg
              className="w-14 h-14"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="font-medium text-base text-green-500">No access events yet</p>
            <p className="text-sm text-green-400 text-center max-w-xs">
              When a doctor scans your QR code, it will be recorded here.
            </p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-green-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-50 border-b border-green-100">
                  <th className="text-left px-5 py-3 font-semibold text-green-700">
                    Doctor Name
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-green-700">
                    Hospital
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-green-700">
                    Action
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-green-700">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-green-50/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-green-900">
                      Dr. {log.doctorName}
                    </td>
                    <td className="px-5 py-4 text-green-700">
                      {log.hospitalName}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-green-500 text-xs font-mono">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function PatientDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-green-900">Patient Dashboard</h1>
        <p className="text-green-600 text-sm mt-1">
          Manage your health records and control doctor access.
        </p>
      </div>

      {/* Top row: QR on the left, Audit on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <QrSection />
        </div>
        <div className="lg:col-span-3">
          <AuditLogSection />
        </div>
      </div>

      {/* Full-width Medical History */}
      <MedicalHistorySection />
    </div>
  );
}
