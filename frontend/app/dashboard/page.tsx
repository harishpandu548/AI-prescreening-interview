"use client";

import { useEffect, useState } from 'react';
import { Briefcase, Users, CheckCircle, TrendingUp, Clock, BarChart3, Activity, ArrowUpRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import api from '@/lib/api';

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/campaigns/stats');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="min-h-[calc(100vh-4rem)] p-8 relative overflow-hidden bg-transparent w-full">
      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-4">
            <div className="h-12 w-64 bg-white/5 rounded-xl animate-pulse backdrop-blur-xl border border-white/10" />
            <div className="h-4 w-96 bg-white/5 rounded-md animate-pulse backdrop-blur-xl border border-white/10" />
          </div>
          <div className="h-10 w-40 bg-white/5 rounded-full animate-pulse backdrop-blur-xl border border-white/10" />
        </div>

        {/* Global Stats Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl animate-pulse overflow-hidden">
               <div className="flex items-start justify-between">
                 <div className="space-y-3">
                   <div className="h-3 w-28 bg-white/10 rounded" />
                   <div className="h-10 w-16 bg-white/10 rounded-lg" />
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-white/10" />
               </div>
               <div className="mt-8 flex gap-2">
                 <div className="h-4 w-12 bg-emerald-500/10 rounded-full" />
                 <div className="h-4 w-20 bg-white/5 rounded-full" />
               </div>
            </div>
          ))}
        </div>

        {/* Bottom Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl animate-pulse p-6">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-6 mb-4">
               <div className="h-6 w-48 bg-white/10 rounded" />
               <div className="h-4 w-16 bg-purple-500/20 rounded" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-white/10 rounded" />
                      <div className="h-3 w-24 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-white/10 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-[400px] rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl animate-pulse p-6" />
        </div>

      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] p-8 relative overflow-hidden text-white bg-transparent">
      <div className="relative z-10 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight" style={{ background: 'linear-gradient(to right, #fff, #a78bfa)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Overview Dashboard
            </h1>
            <p className="text-neutral-400 mt-2 text-lg">
              Manage your AI recruitment campaigns and monitor candidate performance.
            </p>
          </div>
          <Link href="/dashboard/candidates" className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <Activity size={16} className="text-violet-400" />
            Live Activity View
          </Link>
        </div>

        {/* Global Stats Row - Glassmorphic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Total Campaigns', value: stats?.totalCampaigns || 0, icon: Briefcase, color: 'from-blue-500 to-cyan-400', shadow: 'rgba(56,189,248,0.2)', href: '/dashboard/campaigns' },
            { title: 'Registered Candidates', value: stats?.totalCandidates || 0, icon: Users, color: 'from-violet-500 to-fuchsia-400', shadow: 'rgba(192,132,252,0.2)', href: '/dashboard/candidates' },
            { title: 'Evaluated Sessions', value: stats?.totalCompletions || 0, icon: CheckCircle, color: 'from-emerald-400 to-teal-400', shadow: 'rgba(52,211,153,0.2)', href: '/dashboard/candidates' },
          ].map((stat, i) => (
            <Link 
              href={stat.href}
              key={i}
              className="relative p-6 rounded-3xl border border-white/10 overflow-hidden group hover:scale-[1.02] transition-transform block"
              style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)' }}
            >
              {/* Card internal glow */}
              <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-gradient-to-br ${stat.color} opacity-20 blur-3xl transition-opacity group-hover:opacity-40`} />
              
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">{stat.title}</p>
                  <h3 className="text-5xl font-bold mt-2 font-mono text-white/90">{stat.value}</h3>
                </div>
                <div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${stat.color}`}
                  style={{ boxShadow: `0 0 20px ${stat.shadow}` }}
                >
                  <stat.icon size={24} className="text-white" />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 relative z-10">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                  <ArrowUpRight size={12} /> +12%
                </span>
                <span className="text-xs text-neutral-500">vs last month</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Section: Recent Activity & Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main List Panel */}
          <div 
            className="lg:col-span-2 rounded-3xl border border-white/[0.08] p-1 flex flex-col"
            style={{ background: 'rgba(15, 10, 25, 0.4)', backdropFilter: 'blur(24px)' }}
          >
            <div className="p-6 flex items-center justify-between border-b border-white/[0.05]">
              <h2 className="text-xl font-bold">Recent Candidates</h2>
              <Link href="/dashboard/candidates" className="text-sm font-semibold text-violet-400 hover:text-violet-300">View All</Link>
            </div>
            <div className="flex-1 p-2">
              <div className="space-y-1">
                {stats?.recentCandidates?.length > 0 ? (
                  stats.recentCandidates.map((candidate: any) => (
                    <Link
                      href={`/dashboard/results/${candidate.id}`}
                      key={candidate.id} 
                      className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600/30 to-blue-600/30 border border-white/10 flex items-center justify-center text-sm font-bold text-violet-300">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white/90 group-hover:text-white transition-colors">{candidate.name}</p>
                          <p className="text-xs text-neutral-500">{candidate.campaign?.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-semibold text-neutral-400">Score</p>
                          <p className="text-sm font-bold text-white">
                            {candidate.session?.overallScore ? `${candidate.session.overallScore.toFixed(1)} / 10` : '—'}
                          </p>
                        </div>
                        <div className="w-24 text-right">
                          {candidate.session?.completedAt ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</Badge>
                          ) : (
                            <Badge className="bg-neutral-500/10 text-neutral-400 border border-white/10">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-12 text-center text-neutral-500 flex flex-col items-center">
                    <Users size={40} className="mb-3 opacity-20" />
                    <p>No candidate data available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Summary Panel */}
          <div 
            className="rounded-3xl border border-white/[0.08] p-6 relative overflow-hidden flex flex-col"
            style={{ background: 'rgba(15, 10, 25, 0.4)', backdropFilter: 'blur(24px)' }}
          >
            {/* Glossy top reflection */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <h2 className="text-xl font-bold mb-6">Campaign Performance</h2>
            
            <div className="flex-1 flex flex-col justify-center space-y-8">
              {[
                { label: 'Technical Accuracy', score: stats?.performanceMetrics?.technicalAccuracy || 0, color: '#8b5cf6' },
                { label: 'Communication', score: stats?.performanceMetrics?.communication || 0, color: '#3b82f6' },
                { label: 'Depth of Knowledge', score: stats?.performanceMetrics?.depthOfKnowledge || 0, color: '#ec4899' }
              ].map((metric, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-neutral-300">{metric.label}</span>
                    <span className="font-bold text-white">{Number(metric.score).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${metric.score}%`, 
                        background: `linear-gradient(90deg, transparent, ${metric.color})`,
                        boxShadow: `0 0 10px ${metric.color}80` 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => window.print()}
              className="mt-8 p-4 rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden hover:bg-white/[0.07] transition-colors w-full text-left"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
              <div className="relative z-10 flex items-center gap-3">
                <BarChart3 size={24} className="text-violet-400" />
                <div>
                  <p className="text-sm font-bold text-white">Generate Full Report</p>
                  <p className="text-xs text-neutral-400">Export analytics & metrics in PDF</p>
                </div>
              </div>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
