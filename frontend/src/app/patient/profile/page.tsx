'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50   border-red-200   text-red-800',
    info:    'bg-blue-50  border-blue-200  text-blue-800',
  }[type];

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 flex items-start gap-3 max-w-sm w-full px-5 py-4 rounded-xl shadow-xl border text-sm font-medium animate-fade-in ${styles}`}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

// ─── Auto-Geocode via Nominatim (free, no key required) ───────────────────────

async function geocodeAddress(address: string, pincode: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const query = [address, pincode, 'India'].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'HLTH01-HealthPlatform/1.0' },
  });

  if (!res.ok) return null;
  const data: NominatimResult[] = await res.json();
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name,
  };
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function PatientProfilePage() {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');

  const [residentialAddress, setResidentialAddress] = useState('');
  const [pincode, setPincode]                       = useState('');

  // Resolved coordinates (hidden from user)
  const [coords, setCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [geocoding, setGeocoding]   = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pincodeError, setPincodeError] = useState('');

  // ── Fetch profile ──────────────────────────────────────────────────────────

  useEffect(() => {
    apiFetch('/auth/me')
      .then((data: any) => {
        const u = data?.user ?? data;
        setName(u.name ?? '');
        setEmail(u.email ?? '');
        setResidentialAddress(u.residentialAddress ?? '');
        setPincode(u.pincode ?? '');
        if (u.location?.coordinates) {
          const [lng, lat] = u.location.coordinates;
          setCoords({ lat, lng, label: 'Saved location' });
        }
      })
      .catch(() => setToast({ message: 'Failed to load profile data.', type: 'error' }))
      .finally(() => setLoadingProfile(false));
  }, []);

  // ── Geocode from address ──────────────────────────────────────────────────

  const handleGeocode = useCallback(async () => {
    if (!residentialAddress.trim()) {
      setGeocodeError('Please enter your residential address first.');
      return;
    }
    setGeocoding(true);
    setGeocodeError('');
    setCoords(null);
    try {
      const result = await geocodeAddress(residentialAddress, pincode);
      if (!result) {
        setGeocodeError('Could not find your address. Try adding more detail (city, state).');
      } else {
        setCoords(result);
        setToast({ message: '📍 Location detected from your address!', type: 'info' });
      }
    } catch {
      setGeocodeError('Geocoding failed. Please check your internet connection.');
    } finally {
      setGeocoding(false);
    }
  }, [residentialAddress, pincode]);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate pincode
    if (pincode && !/^\d{6}$/.test(pincode)) {
      setPincodeError('Pincode must be exactly 6 digits.');
      return;
    }
    setPincodeError('');

    // Auto-geocode if not yet done (address present but coords missing)
    if (!coords && residentialAddress.trim()) {
      setToast({ message: 'Auto-detecting your location from address…', type: 'info' });
      const result = await geocodeAddress(residentialAddress, pincode);
      if (result) setCoords(result);
    }

    setSaving(true);
    setToast(null);

    const payload: Record<string, any> = { residentialAddress, pincode };
    if (coords) {
      payload.coordinates = [coords.lng, coords.lat];
    }

    try {
      await apiFetch('/patient/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setToast({ message: '✅ Profile updated successfully!', type: 'success' });
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to update profile.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Are you sure you want to permanently delete your account and all associated medical records? This action cannot be undone.')) {
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/me', { method: 'DELETE' });
      // Redirect to login
      window.location.href = '/login';
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete account.',
        type: 'error',
      });
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-green-900">My Profile</h1>
          <p className="text-green-600 text-sm mt-1">
            Keep your contact information and address up to date.
          </p>
        </div>

        {/* Skeleton while loading */}
        {loadingProfile ? (
          <Card className="card">
            <CardContent className="py-10">
              <div className="space-y-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 bg-green-100 rounded w-24" />
                    <div className="h-10 bg-green-50 rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            {/* ── Identity Card ──────────────────────────────────────────── */}
            <Card className="card">
              <CardHeader className="border-b border-green-100 pb-4">
                <CardTitle className="text-base text-green-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="py-6 space-y-4">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="label">Full Name</label>
                  <div className="flex h-10 w-full rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 cursor-not-allowed select-none">
                    {name || '—'}
                  </div>
                  <p className="text-xs text-green-500">Name cannot be changed. Contact support if needed.</p>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="label">Email Address</label>
                  <div className="flex h-10 w-full rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 cursor-not-allowed select-none">
                    {email || '—'}
                  </div>
                  <p className="text-xs text-green-500">Email cannot be changed here.</p>
                </div>
              </CardContent>
            </Card>

            {/* ── Address Card ───────────────────────────────────────────── */}
            <Card className="card">
              <CardHeader className="border-b border-green-100 pb-4">
                <CardTitle className="text-base text-green-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Residential Details
                </CardTitle>
              </CardHeader>
              <CardContent className="py-6 space-y-5">

                {/* Address textarea */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="residentialAddress" className="label">
                    Residential Address
                  </label>
                  <textarea
                    id="residentialAddress"
                    rows={3}
                    value={residentialAddress}
                    onChange={e => setResidentialAddress(e.target.value)}
                    placeholder="e.g. Flat 4B, Linking Road, Bandra West, Mumbai"
                    className="input-field resize-none"
                  />
                </div>

                {/* Pincode */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pincode" className="label">Pincode</label>
                  <input
                    id="pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 400050"
                    className={`input-field ${pincodeError ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                  {pincodeError && <p className="text-xs text-red-500">{pincodeError}</p>}
                </div>

                {/* Detect location button */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={geocoding || !residentialAddress.trim()}
                    className="btn-outline self-start disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {geocoding ? (
                      <>
                        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Detecting location…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Detect Location from Address
                      </>
                    )}
                  </button>
                  {geocodeError && <p className="text-xs text-red-500">{geocodeError}</p>}
                </div>

                {/* Detected location preview */}
                {coords && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-semibold text-green-800 mb-0.5">Location Detected ✓</p>
                      <p className="text-green-600 text-xs leading-relaxed">{coords.label}</p>
                      <p className="text-green-500 text-xs mt-1 font-mono">
                        lat: {coords.lat.toFixed(6)}, lng: {coords.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Info note */}
                <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Why do we need this?</span>{' '}
                    Your location is used to display anonymised disease heatmaps for public-health
                    monitoring (k-anonymity: only shown when ≥5 cases in area). Your exact address is never shared.
                  </p>
                </div>

              </CardContent>
            </Card>

            {/* ── Actions ────────────────────────────────────────────────── */}
            <div className="flex justify-between items-center gap-3 pb-8">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={saving}
                className="text-sm text-red-600 font-semibold hover:text-red-700 hover:underline px-4"
              >
                Delete Account
              </button>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn-outline"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-8 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>

          </form>
        )}
      </div>
    </>
  );
}
