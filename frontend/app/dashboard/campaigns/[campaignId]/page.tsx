"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, ExternalLink, Mail, Link as LinkIcon, CheckCircle2, XCircle, Clock,
  AlertTriangle, Sparkles, X, Send, ListPlus, UserPlus, ChevronDown, ChevronUp,
  Shield, TrendingUp, Users, BarChart3, Upload, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";

export default function CampaignDetailsPage() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Add candidate state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', email: '' });
  const [newResume, setNewResume] = useState<File | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [adminQLines, setAdminQLines] = useState<string[]>(['']);
  const [showQuestions, setShowQuestions] = useState(false);

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<any>(null);
  const [inviteQLines, setInviteQLines] = useState<string[]>(['']);
  const [inviting, setInviting] = useState(false);
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());

  const fetchCampaign = async () => {
    try {
      const { data } = await api.get(`/campaigns/${campaignId}`);
      setCampaign(data);
    } catch { /* handled silently */ }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchCampaign(); 
  }, [campaignId]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const getCleanLines = (lines: string[]) => lines.map(l => l.trim()).filter(l => l.length > 0);

  const addLine = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => [...prev, '']);

  const updateLine = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) =>
    setter(prev => prev.map((l, i) => (i === idx ? val : l)));

  const removeLine = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) =>
    setter(prev => prev.filter((_, i) => i !== idx));

  // ── Add Candidate ────────────────────────────────────────────────────
  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.email) return;
    setAddingCandidate(true);
    setGeneratedLink(null);
    try {
      const formData = new FormData();
      formData.append('name', newCandidate.name);
      formData.append('email', newCandidate.email);
      if (newResume) formData.append('resume', newResume);

      const cleanQ = getCleanLines(adminQLines);
      if (cleanQ.length) formData.append('adminQuestions', JSON.stringify(cleanQ));

      const { data } = await api.post(`/campaigns/${campaignId}/candidates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const base = process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
      setGeneratedLink(`${base}/interview/${data.interviewToken}`);
      toast({ title: "✅ Candidate Added", description: "Resume alignment check running in the background." });
      setNewCandidate({ name: '', email: '' });
      setNewResume(null);
      setAdminQLines(['']);
      setShowQuestions(false);
      fetchCampaign();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to add candidate", variant: "destructive" });
    } finally {
      setAddingCandidate(false);
    }
  };

  // ── Send Invite ───────────────────────────────────────────────────────
  const openInviteDialog = (candidate: any) => {
    if (candidate.inviteSent) {
      const pass = window.prompt("Invite was already sent. Enter Admin Password to resend:", "");
      if (pass !== "admin") {
        toast({ title: "Action Denied", description: "Incorrect password or cancelled.", variant: "destructive" });
        return;
      }
    }
    setInviteTarget(candidate);
    setInviteQLines(['']);
    setInviteDialogOpen(true);
  };

  const handleSendInvite = async (skip = false) => {
    if (!inviteTarget) return;
    
    // Use the invitingIds set to block multiple clicks
    setInviting(true);
    setInvitingIds(prev => new Set(prev).add(inviteTarget.id));
    
    try {
      const customQuestions = skip ? [] : getCleanLines(inviteQLines);
      await api.post(`/campaigns/candidate/${inviteTarget.id}/invite`, { customQuestions });
      toast({ title: "📧 Invitation Sent", description: `Sent to ${inviteTarget.email}${customQuestions.length ? ` with ${customQuestions.length} custom question(s).` : '.'}` });
      setInviteDialogOpen(false);
      fetchCampaign(); // Refresh to sync database status
    } catch {
      toast({ title: "Error", description: "Failed to send invitation", variant: "destructive" });
    } finally { 
      setInviting(false); 
      setInvitingIds(prev => {
        const next = new Set(prev);
        next.delete(inviteTarget.id);
        return next;
      });
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/interview/${token}`);
    toast({ title: "🔗 Copied" });
  };

  const alignmentBadge = (status: string) => {
    if (status === 'ALIGNED') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 size={9} />Aligned
      </span>
    );
    if (status === 'MISALIGNED') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
        <XCircle size={9} />Misaligned
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
        <Clock size={9} />Checking…
      </span>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[calc(100vh-5rem)] p-6 space-y-8 bg-transparent w-full">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full bg-violet-500/20 animate-pulse" />
            <div className="h-8 w-64 bg-white/5 rounded-lg animate-pulse backdrop-blur-xl border border-white/10" />
          </div>
          <div className="flex gap-4 pl-4.5">
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse backdrop-blur-xl border border-white/10" />
            <div className="h-4 w-24 bg-white/5 rounded animate-pulse backdrop-blur-xl border border-white/10" />
          </div>
        </div>
        <div className="h-10 w-44 bg-white/5 rounded-lg animate-pulse backdrop-blur-xl border border-white/10" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/10" />
              <div className="h-3 w-20 bg-white/5 rounded" />
            </div>
            <div className="h-6 w-12 bg-white/10 rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Main Table Area Skeleton */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden animate-pulse">
        <div className="h-16 w-full border-b border-white/5 bg-white/5" />
        <div className="space-y-0">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex h-20 items-center justify-between p-6 border-b border-white/[0.02]">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-white/10" />
                 <div className="space-y-2">
                   <div className="h-4 w-40 bg-white/10 rounded" />
                   <div className="h-3 w-32 bg-white/5 rounded" />
                 </div>
               </div>
               <div className="h-6 w-24 bg-white/5 rounded-full" />
               <div className="h-6 w-16 bg-white/5 rounded" />
               <div className="flex gap-2">
                 <div className="w-8 h-8 rounded-lg bg-white/5" />
                 <div className="w-8 h-8 rounded-lg bg-white/5" />
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (!campaign) return <div className="p-8 text-red-400">Campaign not found</div>;

  const stats = [
    { icon: Users, label: 'Total Candidates', value: campaign.candidates.length, color: 'from-violet-500 to-blue-500' },
    { icon: TrendingUp, label: 'Completed', value: campaign.candidates.filter((c: any) => c.session?.completedAt).length, color: 'from-emerald-500 to-teal-500' },
    { icon: BarChart3, label: 'Strong (7+)', value: campaign.candidates.filter((c: any) => (c.session?.overallScore || 0) >= 7).length, color: 'from-blue-500 to-cyan-500' },
    { icon: Shield, label: 'Warnings', value: campaign.candidates.filter((c: any) => c.session?.antiCheatFlag).length, color: 'from-red-500 to-orange-500' },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] p-6 space-y-8 bg-transparent">
      {/* Ambient blobs removed — using global layout */}

      {/* ── Header ── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-violet-400 to-blue-500" />
            <h1 className="text-3xl font-bold tracking-tight text-white">{campaign.title}</h1>
            <span className="ml-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-violet-500/30 bg-violet-500/10 text-violet-300">
              {campaign.difficulty}
            </span>
          </div>
          <p className="ml-5 text-sm text-neutral-400">
            {campaign.questionCount} questions · {campaign.timePerQuestion}s each
            {campaign.jobRole && <span className="ml-2 text-violet-400">· {campaign.jobRole}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/campaigns/${campaignId}/sourcing`}>
            <button
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-all uppercase tracking-widest flex items-center gap-2"
            >
              <Upload size={14} /> AI Sourcing
            </button>
          </Link>
          <button
            onClick={() => { setAddDialogOpen(true); setGeneratedLink(null); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 active:scale-100"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', boxShadow: '0 0 30px rgba(124,58,237,0.35)' }}
          >
            <UserPlus size={16} /> Add Candidate
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div
            key={s.label}
            className="relative rounded-2xl p-5 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
          >
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 bg-gradient-to-br ${s.color} text-white`}>
              <s.icon size={18} />
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            {/* Subtle glow */}
            <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 bg-gradient-to-br ${s.color}`} />
          </div>
        ))}
      </div>

      {/* ── Candidates Table ── */}
      <div
        className="relative z-10 rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}
      >
        {/* Table header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white text-sm">Candidate Pipeline</h2>
          <span className="text-xs text-neutral-500">{campaign.candidates.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Candidate', 'Status', 'Resume Alignment', 'Match %', 'Score', 'Anti-Cheat', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaign.candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Sparkles size={24} className="text-violet-400" />
                      </div>
                      <p className="text-neutral-500 text-sm">No candidates yet. Click "Add Candidate" to begin.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                campaign.candidates.map((c: any) => {
                  const isExpired = new Date() > new Date(c.tokenExpiry);
                  const isCompleted = !!c.session?.completedAt;
                  const isAttempted = c.attemptUsed;

                  return (
                  <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-white text-sm">{c.name}</div>
                      <div className="text-xs text-neutral-500">{c.email}</div>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      {c.pipelineStage === 'COMPLETED' ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">Completed</span>
                      ) : c.pipelineStage === 'REJECTED' ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">Rejected</span>
                      ) : c.pipelineStage === 'TERMINATED' ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">Terminated</span>
                      ) : c.pipelineStage === 'IN_PROGRESS' ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">In Progress</span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] leading-none text-center">Time Expired</span>
                      ) : c.pipelineStage === 'INVITED' ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">Invited</span>
                      ) : (
                        <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-500/10 text-neutral-400 border border-neutral-700">Sourced</span>
                      )}
                    </td>
                    {/* Alignment */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {isExpired && !isCompleted && !isAttempted ? (
                          <span className="inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 rounded text-[10px] bg-red-500/5 text-red-500/70 border border-red-500/10 uppercase tracking-widest font-bold w-fit">Expired</span>
                        ) : alignmentBadge(c.resumeAlignmentStatus)}
                        {c.resumeAlignmentReason && (!isExpired || isCompleted || isAttempted) && (
                          <div className="relative group/reason w-fit max-w-[160px]">
                            <p className="text-[10px] text-neutral-600 truncate border-b border-dashed border-neutral-700/50 cursor-help">
                              {c.resumeAlignmentReason}
                            </p>
                            <div className="absolute top-full mt-2 left-0 opacity-0 group-hover/reason:opacity-100 transition-opacity w-64 whitespace-normal bg-indigo-950/95 backdrop-blur-xl border border-indigo-500/30 px-3 py-2 rounded-lg text-xs font-semibold text-violet-100 pointer-events-none z-[100] shadow-[0_4px_20px_rgba(79,70,229,0.3)]">
                              {c.resumeAlignmentReason}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Match % */}
                    <td className="px-6 py-4">
                      {isExpired && !isCompleted && !isAttempted ? (
                        <span className="text-neutral-600 text-xs">—</span>
                      ) : c.resume ? (
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${c.resume.skillMatchPercentage}%`,
                                background: 'linear-gradient(90deg, #7c3aed, #3b82f6)'
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-white">{c.resume.skillMatchPercentage}%</span>
                        </div>
                      ) : <span className="text-neutral-600 text-xs">—</span>}
                    </td>
                    {/* Score */}
                    <td className="px-6 py-4">
                      {c.session?.overallScore != null ? (
                        <span className={`font-bold text-sm ${c.session.overallScore >= 7 ? 'text-emerald-400' : c.session.overallScore >= 5 ? 'text-blue-400' : 'text-red-400'}`}>
                          {Number(c.session.overallScore).toFixed(1)}/10
                        </span>
                      ) : <span className="text-neutral-600 text-xs">—</span>}
                    </td>
                    {/* Anti-cheat */}
                    <td className="px-6 py-4">
                      {c.session?.antiCheatFlag ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          <AlertTriangle size={10} />Warning
                        </span>
                      ) : c.session?.completedAt ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-500/20 text-emerald-400">Clean</span>
                      ) : <span className="text-neutral-600 text-xs">—</span>}
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {[
                          { icon: LinkIcon, title: 'Copy Link', action: () => copyLink(c.interviewToken), color: 'hover:text-violet-400', isSent: false, isLoading: false },
                          { icon: Mail, title: c.inviteSent ? 'Resend Invite' : (isExpired ? 'Resend Token Invite' : 'Send Invite'), action: () => openInviteDialog(c), color: 'hover:text-blue-400', isSent: c.inviteSent, isLoading: invitingIds.has(c.id) },
                        ].map(({ icon: Icon, title, action, color, isSent, isLoading }) => (
                          <div key={title} className="relative group/tooltip">
                            <button
                              onClick={action}
                              disabled={isLoading || (isSent && !isExpired)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                (isLoading || (isSent && !isExpired)) ? 'opacity-50 cursor-not-allowed' :
                                isSent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                                `text-neutral-500 bg-white/5 hover:bg-white/10 ${color}`
                              }`}
                            >
                              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
                               isSent && !isExpired ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Icon size={14} />}
                            </button>
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap bg-indigo-950/95 backdrop-blur-xl border border-indigo-500/30 px-2.5 py-1.5 rounded-md text-[10px] uppercase font-black tracking-wider text-violet-200 pointer-events-none z-[100] shadow-[0_4px_20px_rgba(79,70,229,0.3)]">
                              {isLoading ? 'Processing...' : title}
                            </div>
                          </div>
                        ))}
                        <div className="relative group/tooltip">
                          <Link
                            href={`/dashboard/results/${c.id}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap bg-indigo-950/95 backdrop-blur-xl border border-indigo-500/30 px-2.5 py-1.5 rounded-md text-[10px] uppercase font-black tracking-wider text-violet-200 pointer-events-none z-[100] shadow-[0_4px_20px_rgba(79,70,229,0.3)]">
                            VIEW RESULTS
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

      {/* ── Add Candidate Dialog ── */}
      <Dialog open={addDialogOpen} onOpenChange={(o) => { setAddDialogOpen(o); if (!o) setGeneratedLink(null); }}>
        <DialogContent
          className="text-white max-h-[90vh] overflow-y-auto w-full max-w-lg"
          style={{ background: 'rgba(10,8,30,0.95)', border: '1px solid rgba(139,92,246,0.25)', backdropFilter: 'blur(40px)' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserPlus size={18} className="text-violet-400" /> Add Candidate
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-sm">
              Upload resume — AI will verify alignment with the campaign role automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-300">Full Name</Label>
              <Input
                placeholder="John Doe"
                value={newCandidate.name}
                onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })}
                className="bg-white/5 border-white/10 focus:border-violet-500/60 text-white placeholder-neutral-600"
              />
            </div>
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-300">Email Address</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newCandidate.email}
                onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })}
                className="bg-white/5 border-white/10 focus:border-violet-500/60 text-white placeholder-neutral-600"
              />
            </div>
            {/* Resume */}
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-300">Resume (PDF)</Label>
              <div className="flex gap-2">
                <Input
                  type="file" accept=".pdf"
                  className="bg-white/5 border-white/10 text-xs py-2 text-neutral-300"
                  onChange={e => setNewResume(e.target.files?.[0] || null)}
                />
                {newResume && (
                  <button onClick={() => setNewResume(null)} className="text-red-400 hover:text-red-300 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-neutral-600">AI will validate resume–role fit before generating questions.</p>
            </div>

            {/* Divider + Custom Questions toggle */}
            <div className="border-t border-white/8 pt-4">
              <button
                onClick={() => setShowQuestions(!showQuestions)}
                className="flex items-center justify-between w-full group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                    <ListPlus size={14} className="text-violet-400" />
                  </div>
                  <span className="text-sm font-medium text-white">Custom Interview Questions</span>
                  <span className="text-[10px] text-neutral-500 font-normal">optional · AI will polish these</span>
                </div>
                {showQuestions ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
              </button>

              {showQuestions && (
                <div className="mt-4 space-y-2.5">
                  <p className="text-[11px] text-neutral-500">Type rough notes — AI will rewrite them into professional questions and shuffle them with the generated ones.</p>
                  {adminQLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] text-violet-400 font-bold">{idx + 1}</span>
                      </div>
                      <input
                        className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-violet-500/40 transition-colors"
                        placeholder={`e.g. "react hooks", "system design experience"…`}
                        value={line}
                        onChange={e => updateLine(setAdminQLines, idx, e.target.value)}
                      />
                      {adminQLines.length > 1 && (
                        <button onClick={() => removeLine(setAdminQLines, idx)} className="text-neutral-600 hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addLine(setAdminQLines)}
                    className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors mt-1"
                  >
                    <Plus size={13} /> Add another question
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleAddCandidate}
              disabled={addingCandidate || !!generatedLink}
              className="w-full h-11 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-100"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', boxShadow: '0 0 24px rgba(124,58,237,0.3)' }}
            >
              {addingCandidate ? 'Processing…' : generatedLink ? '✅ Candidate Added' : 'Generate Interview Link'}
            </button>

            {/* Generated link */}
            {generatedLink && (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <p className="text-xs text-violet-400 font-semibold mb-2 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Interview Link Ready
                </p>
                <div className="flex gap-2">
                  <input readOnly value={generatedLink} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none" />
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedLink); toast({ title: "Copied!" }); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-neutral-600 mt-2">Use the mail icon to send an email invite with additional questions.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invite Dialog ── */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent
          className="text-white w-full max-w-md"
          style={{ background: 'rgba(10,8,30,0.95)', border: '1px solid rgba(59,130,246,0.25)', backdropFilter: 'blur(40px)' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Mail size={18} className="text-blue-400" /> Send Interview Invite
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-sm">
              Optionally add extra questions for <span className="text-white font-medium">{inviteTarget?.name}</span> before sending.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ListPlus size={14} className="text-blue-400" />
                <Label className="text-sm text-neutral-300">Additional Questions <span className="text-neutral-500 font-normal text-xs">(AI will polish these)</span></Label>
              </div>
              {inviteQLines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] text-blue-400 font-bold">{idx + 1}</span>
                  </div>
                  <input
                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/40 transition-colors"
                    placeholder={`e.g. "AWS experience", "team leadership style"…`}
                    value={line}
                    onChange={e => updateLine(setInviteQLines, idx, e.target.value)}
                  />
                  {inviteQLines.length > 1 && (
                    <button onClick={() => removeLine(setInviteQLines, idx)} className="text-neutral-600 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addLine(setInviteQLines)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                <Plus size={13} /> Add question
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleSendInvite(true)}
                disabled={inviting}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-neutral-300 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all disabled:opacity-50"
              >
                Skip & Send
              </button>
              <button
                onClick={() => handleSendInvite(false)}
                disabled={inviting}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
              >
                <Send size={14} /> {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
