"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Briefcase, LogOut, User as UserIcon, Sparkles } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/login');
  };

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Campaigns', icon: Briefcase, href: '/dashboard/campaigns' },
    { label: 'All Candidates', icon: Users, href: '/dashboard/candidates' },
  ];

  if (!user) return null;

  return (
    <div className="flex h-screen text-white overflow-hidden bg-slate-950 relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/30 blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-fuchsia-900/20 blur-[130px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgyMHYyMEgxeiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-40" />
      </div>

      {/* Minimalistic Glass Sidebar */}
      <aside className="w-64 flex flex-col relative z-50 border-r border-white/5 bg-white/[0.02] backdrop-blur-3xl shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        
        {/* Logo Section */}
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <Sparkles size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              AI PreScreen
            </h1>
          </div>
        </div>
        
        <nav className="flex-1 px-4 mt-8 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.label} href={item.href}>
                <div className={`group flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-violet-500/10 text-white border border-violet-500/20 shadow-[0_0_20px_rgba(124,58,237,0.1)]' 
                    : 'text-neutral-500 border border-transparent hover:bg-white/[0.04] hover:text-neutral-300 hover:border-white/5'
                }`}>
                  <item.icon size={18} className={`${isActive ? 'text-violet-400' : 'group-hover:text-violet-400 transition-colors'}`} />
                  <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 mx-4 mb-6 mt-8 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center text-sm font-black text-violet-300">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white/90 truncate">{user.name}</p>
              <p className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase truncate">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
          >
            <LogOut size={14} />
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto">
        <header className="absolute top-0 inset-x-0 h-20 flex items-center justify-between px-10 z-40 bg-gradient-to-b from-[#0a0514] to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <h2 className="text-sm font-bold tracking-widest text-neutral-500 uppercase">
              {navItems.find(item => pathname === item.href)?.label || ''}
            </h2>
          </div>
          <div className="pointer-events-auto">
            <a href="/docs/walkthrough.md" target="_blank" className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-all">
              Documentation
            </a>
          </div>
        </header>

        <div className="pt-20 z-10 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
