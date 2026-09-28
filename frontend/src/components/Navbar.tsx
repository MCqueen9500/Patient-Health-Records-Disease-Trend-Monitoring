'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { HeartPulse, LayoutDashboard, User, QrCode, Stethoscope, BarChart2, Users, LogOut, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavLink { href: string; label: string; icon: React.ReactNode; }

const PATIENT_LINKS: NavLink[] = [
  { href: '/patient/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/patient/profile',   label: 'Profile',   icon: <User className="h-4 w-4" /> },
];

const DOCTOR_LINKS: NavLink[] = [
  { href: '/doctor/dashboard', label: 'QR Scanner', icon: <QrCode className="h-4 w-4" /> },
  { href: '/doctor/profile',   label: 'Profile',    icon: <Stethoscope className="h-4 w-4" /> },
];

const ADMIN_LINKS: NavLink[] = [
  { href: '/admin/dashboard', label: 'Analytics',  icon: <BarChart2 className="h-4 w-4" /> },
  { href: '/admin/doctors',   label: 'Doctors',    icon: <Users className="h-4 w-4" /> },
];

const ROLE_BADGE: Record<string, string> = {
  PATIENT: 'Patient',
  DOCTOR:  'Doctor',
  ADMIN:   'Admin',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links =
    user?.role === 'PATIENT' ? PATIENT_LINKS :
    user?.role === 'DOCTOR'  ? DOCTOR_LINKS  :
    user?.role === 'ADMIN'   ? ADMIN_LINKS   : [];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-green-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Brand */}
          <Link href={user ? `/${user.role.toLowerCase()}/dashboard` : '/login'}
                className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:shadow-green transition-shadow">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-primary leading-none">HLTH01</span>
              <p className="text-[10px] text-green-500 font-medium leading-none mt-0.5">Healthcare Platform</p>
            </div>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map(({ href, label, icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link key={href} href={href}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150
                      ${active
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-green-700 hover:bg-green-50'
                      }`}>
                    {icon}
                    {label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* User section */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Role badge */}
              <span className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {ROLE_BADGE[user.role]}
              </span>

              {/* Avatar + name */}
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold select-none">
                  {user.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <span className="hidden sm:block text-sm font-semibold text-green-900 max-w-[120px] truncate">
                  {user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-green-500" />
              </div>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute right-4 top-16 w-52 bg-white border border-green-100 rounded-2xl shadow-card-hover py-2 z-50"
                     onMouseLeave={() => setMenuOpen(false)}>
                  <div className="px-4 py-2 border-b border-green-50">
                    <p className="text-xs font-bold text-green-800 truncate">{user.name}</p>
                    <p className="text-xs text-green-500 truncate">{user.email}</p>
                  </div>
                  {links.map(({ href, label, icon }) => (
                    <Link key={href} href={href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors">
                      {icon}{label}
                    </Link>
                  ))}
                  <div className="border-t border-green-50 mt-2 pt-2">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"
                className="px-4 py-2 text-sm font-semibold text-primary hover:bg-green-50 rounded-xl transition-colors">
                Login
              </Link>
              <Link href="/register"
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary-700 transition-colors">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
