'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { AlertTriangle, ShieldCheck, Activity, Pill, Users, MapPin } from 'lucide-react';
import DynamicMap from '@/components/maps/DynamicMap';
import type { HeatmapPoint } from '@/components/maps/HeatmapLayer';
import { apiFetch } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutbreakAlert {
  id: string;
  diseaseCategory: string;
  pincode: string;
  count: number;
  lastSeen?: string;
}

interface PharmacyDemand {
  medicine: string;
  totalQuantity: number;
  prescriptions: number;
}

interface DemographicRisk {
  diseaseCategory: string;
  totalCases: number;
  avgFee: number;
  affectedPincodes: number;
  riskLevel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DISEASE_CATEGORIES = [
  'All',
  'Infectious',
  'Respiratory',
  'Vector-borne',
  'Waterborne',
  'Chronic',
];

function getSeverity(count: number): { label: string; color: string; bg: string } {
  if (count > 15) return { label: 'CRITICAL', color: 'text-red-700', bg: 'bg-red-100' };
  if (count > 8) return { label: 'ELEVATED', color: 'text-amber-700', bg: 'bg-amber-100' };
  return { label: 'MONITORED', color: 'text-green-700', bg: 'bg-green-100' };
}

function getRiskBadge(risk: string): string {
  switch (risk?.toUpperCase()) {
    case 'HIGH': return 'bg-red-100 text-red-700 border border-red-200';
    case 'MEDIUM': return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'LOW': return 'bg-green-100 text-green-700 border border-green-200';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-green-100 p-6 animate-pulse space-y-3">
      <div className="h-5 bg-green-100 rounded w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-green-50 rounded w-full" />
      ))}
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, sub }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <p className="text-xs text-green-600 font-semibold uppercase tracking-wider">{label}</p>
        <div className="p-2 rounded-xl bg-green-50 text-primary">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-green-950 mt-1">{value}</p>
        {sub && <p className="text-xs text-green-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [selectedDisease, setSelectedDisease] = useState('All');
  const [outbreaks, setOutbreaks] = useState<OutbreakAlert[]>([]);
  const [pharmacyDemand, setPharmacyDemand] = useState<PharmacyDemand[]>([]);
  const [demographicRisk, setDemographicRisk] = useState<DemographicRisk[]>([]);

  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingPharmacy, setLoadingPharmacy] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(true);

  const fetchData = useCallback(async () => {
    // Heatmap
    apiFetch('/admin/analytics/heatmap')
      .then((data: any) => setHeatmapPoints(data?.heatmap ?? data ?? []))
      .catch(() => setHeatmapPoints([]))
      .finally(() => setLoadingMap(false));

    // Outbreak alerts
    apiFetch('/admin/analytics/outbreak-alerts')
      .then((data: any) => setOutbreaks(data?.alerts ?? data ?? []))
      .catch(() => setOutbreaks([]))
      .finally(() => setLoadingAlerts(false));

    // Pharmacy demand
    apiFetch('/admin/analytics/pharmacy-demand')
      .then((data: any) => setPharmacyDemand(data?.pharmacyDemand ?? data ?? []))
      .catch(() => setPharmacyDemand([]))
      .finally(() => setLoadingPharmacy(false));

    // Demographic risk
    apiFetch('/admin/analytics/demographic-risk')
      .then((data: any) => setDemographicRisk(data?.demographicRisk ?? data ?? []))
      .catch(() => setDemographicRisk([]))
      .finally(() => setLoadingDemo(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredPoints =
    selectedDisease === 'All'
      ? heatmapPoints
      : heatmapPoints.filter((p) => p.dominantDisease === selectedDisease);

  const suppressedNote = heatmapPoints.length > 0
    ? `${heatmapPoints.length} cluster(s) visualized • Groups with < 5 incidents are suppressed under k-anonymity guarantee`
    : 'No clusters meet the k-anonymity threshold (k ≥ 5) for this filter.';

  const radarData = demographicRisk.map((d) => ({
    subject: d.diseaseCategory,
    value: d.totalCases,
  }));

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-950">
            Public Health Analytics Dashboard
          </h1>
          <p className="text-green-600 mt-1 text-sm">
            Privacy-Preserving Epidemiological Intelligence · Enforcing strict <span className="font-semibold text-green-800">k-Anonymity (k ≥ 5)</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-sm">
          <ShieldCheck className="w-4 h-4 text-primary" />
          k-Anonymity Active
        </span>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBadge icon={MapPin} label="Disease Clusters" value={heatmapPoints.length} sub="geo-anonymized" />
        <StatBadge icon={AlertTriangle} label="Active Outbreaks" value={outbreaks.length} sub="hotspot zones" />
        <StatBadge icon={Pill} label="Drugs Monitored" value={pharmacyDemand.length} sub="demand intelligence" />
        <StatBadge icon={Users} label="Disease Categories" value={demographicRisk.length} sub="categorized cohorts" />
      </div>

      {/* ── Section 1: Heatmap ─────────────────────────────────────────── */}
      <section className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-green-950">Disease Cluster Geographic Heatmap</h2>
          </div>
          <select
            value={selectedDisease}
            onChange={(e) => setSelectedDisease(e.target.value)}
            className="input-field max-w-xs py-1.5 px-3 bg-white"
          >
            {DISEASE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {loadingMap ? (
          <div className="h-96 bg-green-50/50 animate-pulse rounded-2xl flex items-center justify-center">
            <p className="text-green-600 text-sm font-medium">Loading geospatial clusters…</p>
          </div>
        ) : (
          <div className="h-96 rounded-2xl overflow-hidden border border-green-100 shadow-inner">
            <DynamicMap points={filteredPoints} />
          </div>
        )}

        <p className="text-xs text-green-600 italic">{suppressedNote}</p>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-1 border-t border-green-50">
          {[
            { label: 'Infectious', color: '#EF4444' },
            { label: 'Respiratory', color: '#3B82F6' },
            { label: 'Vector-borne', color: '#EAB308' },
            { label: 'Waterborne', color: '#06B6D4' },
            { label: 'Chronic', color: '#8B5CF6' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-green-800">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Section 2: Outbreak Alerts ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-green-950">Epidemic Early Warning Alerts</h2>
        </div>

        {loadingAlerts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} rows={2} />)}
          </div>
        ) : outbreaks.length === 0 ? (
          <div className="card text-center text-green-600 text-sm py-8">
            No active outbreak clusters detected in the last 14 days.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {outbreaks.map((alert) => {
              const sev = getSeverity(alert.count);
              return (
                <div
                  key={alert.id ?? `${alert.pincode}-${alert.diseaseCategory}`}
                  className="card p-5 space-y-3 hover:shadow-card-hover transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${sev.color}`} />
                      <span className="text-sm font-bold text-green-950">
                        {alert.diseaseCategory}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                      {sev.label}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-green-800">
                    <p>
                      <span className="text-green-600">Pincode: </span>
                      <span className="font-semibold text-green-950">{alert.pincode}</span>
                    </p>
                    <p>
                      <span className="text-green-600">Recorded Cases: </span>
                      <span className="text-green-950 font-bold">{alert.count}</span>
                    </p>
                    {alert.lastSeen && (
                      <p className="text-xs text-green-500 pt-1">
                        Detected: {new Date(alert.lastSeen).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 3: Pharmacy Demand ─────────────────────────────────── */}
      <section className="card space-y-4">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-green-950">Regional Medicine & Supply Demand</h2>
        </div>

        {loadingPharmacy ? (
          <div className="h-80 bg-green-50/50 animate-pulse rounded-2xl" />
        ) : pharmacyDemand.length === 0 ? (
          <p className="text-center text-green-600 text-sm py-16">No pharmacy consumption data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={pharmacyDemand}
              margin={{ top: 8, right: 20, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#DCFCE7" />
              <XAxis
                dataKey="medicine"
                tick={{ fontSize: 11, fill: '#166534' }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#166534' }} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: '1rem',
                  border: '1px solid #BBF7D0',
                  boxShadow: '0 4px 16px rgba(22, 163, 74, 0.1)',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                }}
                formatter={(value: number, _: string, props: { payload?: PharmacyDemand }) => [
                  <>
                    <span className="font-bold text-primary">{value.toLocaleString()}</span> units
                    {props.payload && (
                      <><br /><span className="text-green-600">{props.payload.prescriptions} prescriptions</span></>
                    )}
                  </>,
                  'Aggregate Demand',
                ]}
              />
              <Bar dataKey="totalQuantity" fill="#16a34a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Section 4: Demographic Risk Matrix ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-green-950">Demographic Disease Prevalence & Severity</h2>
        </div>

        {loadingDemo ? (
          <SkeletonCard rows={5} />
        ) : demographicRisk.length === 0 ? (
          <div className="card text-center text-green-600 text-sm py-8">
            No demographic risk patterns detected.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Table */}
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-50 border-b border-green-100">
                    {['Disease Category', 'Total Cases', 'Avg Fee (₹)', 'Pincodes', 'Risk'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-green-800 uppercase tracking-wider px-4 py-3.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-50">
                  {demographicRisk.map((row) => (
                    <tr
                      key={row.diseaseCategory}
                      className="hover:bg-green-50/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-bold text-green-950">{row.diseaseCategory}</td>
                      <td className="px-4 py-3.5 text-green-800">{row.totalCases.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-green-800 font-medium">₹{Number(row.avgFee).toFixed(0)}</td>
                      <td className="px-4 py-3.5 text-green-700">{row.affectedPincodes}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getRiskBadge(row.riskLevel)}`}>
                          {row.riskLevel?.toUpperCase() ?? 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Radar Chart */}
            <div className="card flex flex-col items-center">
              <p className="text-sm font-bold text-green-900 mb-2 self-start">Epidemiological Category Footprint</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#DCFCE7" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: '#166534' }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    tick={{ fontSize: 9, fill: '#86EFAC' }}
                  />
                  <Radar
                    name="Cases"
                    dataKey="value"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #BBF7D0',
                      fontSize: '12px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
