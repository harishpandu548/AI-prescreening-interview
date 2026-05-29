"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Briefcase, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import api from '@/lib/api';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const { data } = await api.get('/campaigns');
        setCampaigns(data);
      } catch (error) {
        console.error('Failed to fetch campaigns', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  if (loading) return (
    <div className="min-h-[calc(100vh-5rem)] p-8 relative w-full bg-transparent">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-4 border-b border-white/5">
          <div className="space-y-4">
            <div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse backdrop-blur-xl border border-white/10" />
            <div className="h-4 w-80 bg-white/5 rounded-md animate-pulse backdrop-blur-xl border border-white/10" />
          </div>
          <div className="h-12 w-44 bg-white/5 rounded-full animate-pulse backdrop-blur-xl border border-white/10" />
        </div>

        {/* Campaigns Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-3xl p-6 border border-white/5 bg-white/[0.02] backdrop-blur-xl animate-pulse flex flex-col justify-between h-[280px]">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="w-16 h-6 rounded-full bg-white/10" />
              </div>
              <div className="space-y-3 mt-4">
                <div className="h-6 w-3/4 bg-white/10 rounded-lg" />
                <div className="h-4 w-1/2 bg-white/5 rounded-md" />
              </div>
              <div className="mt-auto space-y-4">
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-white/5 rounded-full" />
                  <div className="h-6 w-20 bg-white/5 rounded-full" />
                </div>
                <div className="pt-4 border-t border-white/5 flex justify-between">
                  <div className="h-4 w-20 bg-white/5 rounded" />
                  <div className="h-4 w-16 bg-emerald-500/10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] p-8 relative overflow-hidden text-white bg-transparent">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">Hiring Campaigns</h1>
            <p className="text-neutral-400 mt-2 text-sm">Manage active recruitment drives and role requirements.</p>
          </div>
          <Link href="/dashboard/campaigns/new">
            <button className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold shadow-[0_0_24px_rgba(124,58,237,0.3)] transition-all hover:scale-105 active:scale-100" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
              <Plus size={18} />
              Create Campaign
            </button>
          </Link>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.length === 0 ? (
            <div className="col-span-full border border-dashed border-white/10 rounded-3xl bg-white/[0.01] text-center py-24 flex flex-col items-center">
               <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex flex-col items-center justify-center mb-6">
                  <Briefcase size={28} className="text-violet-400 opacity-60" />
               </div>
               <h3 className="text-xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent mb-2">No Campaigns Found</h3>
               <p className="text-neutral-500 mb-6">Get started by building your first AI-driven hiring campaign.</p>
               <Link href="/dashboard/campaigns/new">
                 <button className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-violet-300 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-all">
                   Create Campaign
                 </button>
               </Link>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                <div 
                  className="group rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-6 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10 overflow-hidden relative flex flex-col h-full"
                >
                  {/* Hover Glow */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Top Section */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white/90 group-hover:text-white transition-colors mb-1">
                        {campaign.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-neutral-500">
                        <Calendar size={12} className="text-violet-400" />
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-bold">
                      {campaign.difficulty}
                    </Badge>
                  </div>

                  {/* Skills Body */}
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 mb-3">Required Technical Stack</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {campaign.requiredSkills.slice(0, 3).map((skill: string) => (
                        <span key={skill} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/40 text-neutral-300 border border-white/5">
                          {skill}
                        </span>
                      ))}
                      {campaign.requiredSkills.length > 3 && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 text-neutral-500 border border-white/5">
                          +{campaign.requiredSkills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-5 mt-auto border-t border-white/5">
                    <div>
                      <span className="text-[9px] font-bold tracking-widest uppercase text-neutral-500 flex items-center gap-1 mb-1">
                        <Users size={10} className="text-emerald-400" /> Active Candidates
                      </span>
                      <span className="text-lg font-black text-white ml-2">{campaign._count?.candidates || 0}</span>
                    </div>
                    <div className="text-right flex items-center justify-end">
                       <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-400 group-hover:text-violet-300 transition-colors">
                          Manage <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                       </span>
                    </div>
                  </div>

                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
