"use client";

import { useEffect, useState } from 'react';
import { Search, Filter, ExternalLink, Calendar, Briefcase, Mail, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

export default function AllCandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sentInvites');
      if (stored) setSentInvites(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/campaigns/all-candidates');
        setCandidates(data);
      } catch (error: any) {
        if (error.response?.status !== 401 && error.response?.status !== 403) {
          toast({ title: "Error", description: "Failed to load candidates. Please try again.", variant: "destructive" });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const handleSendInvite = async (candidate: any) => {
    if (candidate.inviteSent) {
      const pass = window.prompt("Invite was already sent. Enter Admin Password to resend:", "");
      if (pass !== "admin") {
        toast({ title: "Action Denied", description: "Incorrect password or cancelled.", variant: "destructive" });
        return;
      }
    }

    setInvitingId(candidate.id);
    try {
      await api.post(`/campaigns/candidate/${candidate.id}/invite`);
      toast({ title: "Invitation Sent", description: "Email invitation has been sent." });
      
      // Refresh data to update UI
      const { data } = await api.get('/campaigns/all-candidates');
      setCandidates(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to send invitation", variant: "destructive" });
    } finally {
      setInvitingId(null);
    }
  };

  const filteredCandidates = candidates.filter(c => 
    (c.name?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (c.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (c.campaign?.title?.toLowerCase() || '').includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-[calc(100vh-5rem)] p-8 relative w-full bg-transparent">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
          <div className="space-y-4">
            <div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse backdrop-blur-xl border border-white/10" />
            <div className="h-4 w-96 bg-white/5 rounded-md animate-pulse backdrop-blur-xl border border-white/10" />
          </div>
          <div className="w-full md:w-96 h-12 bg-white/5 rounded-2xl animate-pulse backdrop-blur-xl border border-white/10" />
        </div>

        {/* Table Area Skeleton */}
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden animate-pulse">
           <div className="h-14 w-full bg-white/5 border-b border-white/5" />
           <div className="space-y-0">
             {[1, 2, 3, 4, 5, 6].map(i => (
               <div key={i} className="flex h-20 items-center justify-between p-6 border-b border-white/[0.02]">
                  {/* Candidate Cell */}
                  <div className="flex items-center gap-4 w-1/4">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-3/4 bg-white/10 rounded" />
                      <div className="h-3 w-1/2 bg-white/5 rounded" />
                    </div>
                  </div>
                  
                  {/* Campaign Cell */}
                  <div className="h-4 w-32 bg-white/5 rounded-full" />
                  
                  {/* Status Cell */}
                  <div className="h-6 w-24 bg-white/5 rounded-full" />
                  
                  {/* Match Match */}
                  <div className="h-2 w-16 bg-white/5 rounded-full" />
                  
                  {/* Score */}
                  <div className="h-6 w-10 bg-white/10 rounded" />
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <div className="w-9 h-9 rounded-xl bg-white/5" />
                    <div className="w-9 h-9 rounded-xl bg-white/5" />
                  </div>
               </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] p-8 relative overflow-hidden text-white bg-transparent">
      {/* Ambient blobs removed — handled by global layout.tsx */}

      <div className="relative z-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">Global Candidates</h1>
            <p className="text-neutral-400 mt-2 text-sm">Comprehensive view of all applicants across every active campaign footprint.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <Input 
              placeholder="Search by name, email, or campaign..." 
              className="pl-12 bg-white/5 border-white/10 text-white placeholder-neutral-500 focus:border-violet-500/50 h-12 rounded-2xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Glassmorphic Table Container */}
        <div 
          className="rounded-3xl border border-white/[0.08] p-1 flex flex-col overflow-hidden"
          style={{ background: 'rgba(15, 10, 25, 0.4)', backdropFilter: 'blur(24px)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {['Candidate', 'Applied Campaign', 'Status', 'Match Profile', 'Evaluation', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4 text-neutral-500">
                        <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex flex-col items-center justify-center">
                          <Sparkles size={28} className="text-violet-400 opacity-60" />
                        </div>
                        <p>No candidates available matching criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isExpired = new Date() > new Date(candidate.tokenExpiry);
                    const isCompleted = !!candidate.session?.completedAt;
                    const isAttempted = candidate.attemptUsed;

                    return (
                    <tr key={candidate.id} className="border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors group">
                      
                      {/* Name / Email */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600/30 to-blue-600/30 border border-white/10 flex items-center justify-center text-sm font-bold text-violet-300">
                            {candidate.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white/90 group-hover:text-white transition-colors">{candidate.name}</p>
                            <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                              <Mail size={10} /> {candidate.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Campaign */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                          <Briefcase size={12} className="text-violet-400" />
                          {candidate.campaign?.title}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        {candidate.pipelineStage === 'COMPLETED' ? (
                           <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">Completed</Badge>
                        ) : candidate.pipelineStage === 'REJECTED' ? (
                           <Badge className="bg-red-500/10 text-red-400 border border-red-500/20">Rejected</Badge>
                        ) : candidate.pipelineStage === 'TERMINATED' ? (
                           <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20">Terminated</Badge>
                        ) : candidate.pipelineStage === 'IN_PROGRESS' ? (
                           <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">In Progress</Badge>
                        ) : isExpired ? (
                           <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">Time Expired</Badge>
                        ) : candidate.pipelineStage === 'INVITED' ? (
                           <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20">Invited</Badge>
                        ) : (
                           <Badge className="bg-neutral-500/10 text-neutral-400 border border-white/10">Sourced</Badge>
                        )}
                      </td>

                      {/* Match Profile */}
                      <td className="px-6 py-5">
                        {isExpired && !isCompleted && !isAttempted ? (
                           <span className="text-red-500/50 text-[10px] uppercase font-bold tracking-widest border border-red-500/10 px-2.5 py-1 rounded-lg">Expired</span>
                        ) : candidate.resume ? (
                           <div className="flex items-center gap-3">
                              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full rounded-full" 
                                    style={{ width: `${candidate.resume.skillMatchPercentage}%`, background: 'linear-gradient(90deg, #7c3aed, #3b82f6)' }}
                                 />
                              </div>
                              <span className="text-xs font-bold text-white">{candidate.resume.skillMatchPercentage}%</span>
                           </div>
                        ) : <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-widest">Pending</span>}
                      </td>

                      {/* Evaluation Score */}
                      <td className="px-6 py-5">
                        {candidate.session?.overallScore ? (
                          <div className="flex items-baseline gap-1">
                             <span className={`text-lg font-black ${candidate.session.overallScore >= 7 ? 'text-emerald-400' : candidate.session.overallScore >= 5 ? 'text-blue-400' : 'text-red-400'}`}>
                               {candidate.session.overallScore.toFixed(1)}
                             </span>
                             <span className="text-[10px] text-neutral-500 uppercase tracking-widest">/10</span>
                          </div>
                        ) : <span className="text-neutral-600 text-xs">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5">
                        <div className="flex justify-start gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          
                          <div className="relative group/tooltip">
                            <button 
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${candidate.inviteSent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'text-neutral-400 border border-white/5 bg-black/40 hover:bg-white/10 hover:text-white'} ${invitingId === candidate.id ? 'animate-pulse' : ''}`}
                              onClick={() => handleSendInvite(candidate)}
                              disabled={invitingId === candidate.id}
                            >
                              {candidate.inviteSent ? <CheckCircle2 size={16} /> : <Mail size={16} />}
                            </button>
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap bg-indigo-950/95 backdrop-blur-xl border border-indigo-500/30 px-3 py-1.5 rounded-md text-[10px] uppercase font-black tracking-wider text-violet-200 pointer-events-none z-[100] shadow-[0_4px_20px_rgba(79,70,229,0.3)]">
                              {candidate.inviteSent ? "Resend Invite" : (isExpired ? "Resend Token" : "Send Invite")}
                            </div>
                          </div>

                          <div className="relative group/tooltip">
                            <Link 
                              href={`/dashboard/results/${candidate.id}`}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/20 hover:text-white transition-all"
                            >
                              <ExternalLink size={16} />
                            </Link>
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap bg-indigo-950/95 backdrop-blur-xl border border-indigo-500/30 px-3 py-1.5 rounded-md text-[10px] uppercase font-black tracking-wider text-violet-200 pointer-events-none z-[100] shadow-[0_4px_20px_rgba(79,70,229,0.3)]">
                              VIEW REPORT
                            </div>
                          </div>
                          
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
