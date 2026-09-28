import Link from 'next/link';
import { HeartPulse, Shield, QrCode, Activity, ArrowRight, CheckCircle2, Stethoscope, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-green-950 flex flex-col justify-between selection:bg-green-200">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="border-b border-green-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-green">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-green-950">HLTH</span>
              <span className="font-extrabold text-xl text-primary">01</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="btn-outline py-2 px-4 text-xs sm:text-sm"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-primary py-2 px-4 text-xs sm:text-sm"
            >
              Register as Patient
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col items-center justify-center text-center">
        {/* Privacy Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100/70 text-green-800 text-xs font-semibold mb-6 border border-green-200">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>Cryptographically Secured · k-Anonymized Epidemiological Data</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-green-950 max-w-4xl leading-[1.15]">
          Privacy-First Electronic Healthcare & Epidemic Intelligence
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-green-800/80 max-w-2xl leading-relaxed">
          Empowering patients with one-time dynamic QR code access, enabling doctors with instant clinical histories, and equipping public health authorities with privacy-preserving disease surveillance.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <Link
            href="/login"
            className="btn-primary px-8 py-3.5 text-base shadow-green hover:shadow-card-hover flex items-center justify-center gap-2"
          >
            Launch Platform <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="btn-outline px-8 py-3.5 text-base flex items-center justify-center gap-2"
          >
            Create Patient Account
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left">
          {/* Card 1 */}
          <div className="card hover:shadow-card-hover transition-all space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center text-primary">
              <QrCode className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-green-950">Patient-Controlled Access</h3>
            <p className="text-sm text-green-700 leading-relaxed">
              Patients generate short-lived, encrypted dynamic QR tokens to authorize doctor consultations. No permanent sharing, full audit logging.
            </p>
            <ul className="text-xs text-green-800 space-y-1.5 pt-2">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>2-minute rotating nonce protection</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>Real-time access audit timeline</span>
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="card hover:shadow-card-hover transition-all space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center text-primary">
              <Stethoscope className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-green-950">Clinical Workflow Support</h3>
            <p className="text-sm text-green-700 leading-relaxed">
              Scan patient QR codes instantly to inspect historical diagnoses, track prescriptions, and record new medical encounters securely.
            </p>
            <ul className="text-xs text-green-800 space-y-1.5 pt-2">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>Camera or image QR validation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>Automated pharmacy demand logging</span>
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="card hover:shadow-card-hover transition-all space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-green-950">k-Anonymity Surveillance</h3>
            <p className="text-sm text-green-700 leading-relaxed">
              Health agencies monitor disease clusters, regional outbreaks, and drug demands on Leaflet heatmaps without compromising patient identities.
            </p>
            <ul className="text-xs text-green-800 space-y-1.5 pt-2">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>Minimum k ≥ 5 anonymization filter</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>Epidemiological early warnings</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-green-100 bg-white py-8 text-center text-xs text-green-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 HLTH01 Healthcare Platform. Built with privacy-preserving architecture.</p>
          <div className="flex gap-4 font-semibold text-green-800">
            <Link href="/login" className="hover:text-primary">Sign In</Link>
            <Link href="/register" className="hover:text-primary">Patient Registration</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
