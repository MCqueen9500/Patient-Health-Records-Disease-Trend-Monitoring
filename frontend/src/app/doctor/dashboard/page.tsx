'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Camera, Upload, QrCode, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

type TabId = 'camera' | 'upload';

interface ValidateQRResponse {
  sessionToken: string;
  patientId: string;
}

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('camera');

  // ── Camera scan state ──────────────────────────────────────────────────────
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState('');
  const scannerRef = useRef<import('html5-qrcode').Html5QrcodeScanner | null>(null);
  const scannerMounted = useRef(false);

  // ── Upload scan state ──────────────────────────────────────────────────────
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Shared validate helper ─────────────────────────────────────────────────
  const validateQR = async (
    decodedText: string,
    setStatus: React.Dispatch<React.SetStateAction<'idle' | 'scanning' | 'success' | 'error'>>,
    setMessage: React.Dispatch<React.SetStateAction<string>>
  ) => {
    try {
      const data: ValidateQRResponse = await apiFetch('/doctor/validate-qr', {
        method: 'POST',
        body: JSON.stringify({ qrToken: decodedText }),
      });

      localStorage.setItem('doctorSessionToken', data.sessionToken);
      setStatus('success');
      setMessage('QR validated successfully! Loading patient records…');
      router.push(`/doctor/patient/${data.patientId}?session=${data.sessionToken}`);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'QR code validation failed.');
    }
  };

  // ── Camera tab: init / cleanup ─────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'camera') return;
    if (scannerMounted.current) return;

    let scanner: import('html5-qrcode').Html5QrcodeScanner;

    (async () => {
      const { Html5QrcodeScanner } = await import('html5-qrcode');

      scanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        /* verbose= */ false
      );

      scanner.render(
        async (decodedText) => {
          if (scanStatus === 'success') return;
          setScanStatus('scanning');
          setScanMessage('Validating QR token with server…');
          await validateQR(decodedText, setScanStatus, setScanMessage);
        },
        () => {}
      );

      scannerRef.current = scanner;
      scannerMounted.current = true;
      setScanStatus('scanning');
      setScanMessage('Align the patient QR code inside the box.');
    })();

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {
          // Scanner cleanup can fail if the camera has already stopped.
        }
        scannerRef.current = null;
        scannerMounted.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Tab switch ─────────────────────────────────────────────────────────────
  const handleTabSwitch = (tab: TabId) => {
    if (tab === activeTab) return;
    if (tab !== 'camera' && scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch {
        // Scanner cleanup can fail if the camera has already stopped.
      }
      scannerRef.current = null;
      scannerMounted.current = false;
      setScanStatus('idle');
      setScanMessage('');
    }
    setActiveTab(tab);
  };

  // ── Upload tab ─────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('scanning');
    setUploadMessage('Reading QR image…');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('upload-scanner-hidden');
      const result = await scanner.scanFile(file, false);
      try {
        scanner.clear();
      } catch {
        // Scanner cleanup can fail if decoding already stopped it.
      }

      setUploadMessage('Validating QR token with server…');
      await validateQR(result, setUploadStatus, setUploadMessage);
    } catch (err: unknown) {
      setUploadStatus('error');
      setUploadMessage(
        err instanceof Error ? err.message : 'Could not decode a valid QR code from this image.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const StatusBadge = ({
    status,
    message,
  }: {
    status: 'idle' | 'scanning' | 'success' | 'error';
    message: string;
  }) => {
    if (!message) return null;

    if (status === 'scanning') {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm font-medium text-green-800">
          <RefreshCw className="h-4 w-4 text-primary animate-spin" />
          {message}
        </div>
      );
    }
    if (status === 'success') {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {message}
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          {message}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
        {message}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-green-900">QR Scanner Dashboard</h1>
        <p className="mt-1 text-sm text-green-600">
          Scan or upload a patient's QR code to securely access their medical profile and history.
        </p>
      </div>

      {/* Scanner Card */}
      <div className="card p-0 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-green-100 bg-green-50/50">
          <button
            onClick={() => handleTabSwitch('camera')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'camera'
                ? 'text-primary border-b-2 border-primary bg-white shadow-sm'
                : 'text-green-700 hover:text-primary hover:bg-green-100/50'
            }`}
          >
            <Camera className="h-4 w-4" />
            Camera Scan
          </button>
          <button
            onClick={() => handleTabSwitch('upload')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'upload'
                ? 'text-primary border-b-2 border-primary bg-white shadow-sm'
                : 'text-green-700 hover:text-primary hover:bg-green-100/50'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload QR Image
          </button>
        </div>

        <div className="p-6">
          {/* ── Camera Scan Tab ─────────────────────────────────────────────── */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <p className="text-sm text-green-700">
                Hold the patient's dynamic QR code in front of your camera. Access is granted instantly.
              </p>

              <div
                id="reader"
                className="rounded-2xl overflow-hidden border border-green-200 bg-black/5"
              />

              <StatusBadge status={scanStatus} message={scanMessage} />
            </div>
          )}

          {/* ── Upload QR Image Tab ──────────────────────────────────────────── */}
          {activeTab === 'upload' && (
            <div className="space-y-5">
              <p className="text-sm text-green-700">
                Upload a photo or screenshot of the patient's QR code to decode and validate it.
              </p>

              <div id="upload-scanner-hidden" className="hidden" />

              <label
                htmlFor="qr-upload"
                className={`flex flex-col items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all py-12 ${
                  uploadStatus === 'scanning'
                    ? 'border-primary bg-green-50'
                    : 'border-green-200 bg-green-50/30 hover:border-primary hover:bg-green-50'
                }`}
              >
                <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center text-primary">
                  <QrCode className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-green-900">
                    Click to select a QR image
                  </p>
                  <p className="text-xs text-green-500 mt-1">Supports PNG, JPG, WEBP</p>
                </div>
                <input
                  id="qr-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploadStatus === 'scanning'}
                />
              </label>

              <StatusBadge status={uploadStatus} message={uploadMessage} />

              {uploadStatus === 'error' && (
                <button
                  onClick={() => {
                    setUploadStatus('idle');
                    setUploadMessage('');
                  }}
                  className="text-sm font-semibold text-primary hover:text-green-800 underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Guide Info */}
      <div className="rounded-2xl bg-green-50 border border-green-200 p-5">
        <h3 className="text-sm font-bold text-green-900 mb-2">
          How Patient Consultation Works
        </h3>
        <ol className="text-sm text-green-800 list-decimal list-inside space-y-1.5 leading-relaxed">
          <li>Ask the patient to open their dashboard and show their one-time QR code.</li>
          <li>Scan or upload the code above to securely authenticate doctor access.</li>
          <li>Review their full medical timeline and prescribe new medications as needed.</li>
        </ol>
      </div>
    </div>
  );
}
