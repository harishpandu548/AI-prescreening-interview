"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  Search, 
  Filter, 
  UserPlus, 
  Loader2, 
  Mail,
  Edit2,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SourcingPage() {
  const { campaignId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Email Update Dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // Bulk Promote Dialog
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [extraQuestions, setExtraQuestions] = useState<string[]>(['']);
  const [promoting, setPromoting] = useState(false);
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());
  const [purging, setPurging] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      const [campRes, candRes] = await Promise.all([
        api.get(`/campaigns/${campaignId}`),
        api.get(`/campaigns/${campaignId}/sourcing`)
      ]);
      setCampaign(campRes.data);
      setCandidates(candRes.data);
    } catch (err) {
      if (!isSilent) {
        toast({ title: "Error", description: "Failed to load sourcing data", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId, toast]);

  useEffect(() => {
    fetchData();
    // Poll for status updates if there are pending candidates
    const interval = setInterval(() => {
      const hasPending = candidates.some(c => c.resumeAlignmentStatus === 'PARSING' || c.resumeAlignmentStatus === 'IN_QUEUE');
      if (hasPending) fetchData(true); // Silent update during polling
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData, candidates.length]); // Dependency on length to minimize interval churn

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('resumes', file));

    try {
      await api.post(`/campaigns/${campaignId}/bulk-upload`, formData);
      toast({ title: "Processing Started", description: `We are parsing ${files.length} resumes in the background.` });
      fetchData();
    } catch (err) {
      toast({ title: "Upload Failed", description: "Could not process bulk upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!editingCandidate || !newEmail) return;
    setUpdatingEmail(true);
    try {
      await api.patch(`/campaigns/candidate/${editingCandidate.id}/email`, { email: newEmail });
      toast({ title: "Email Updated" });
      setEmailDialogOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: "Update Failed", variant: "destructive" });
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handlePurge = async () => {
    if (!confirm("Are you sure you want to remove all stuck/broken profiles?")) return;
    setPurging(true);
    try {
      await api.delete(`/campaigns/${campaignId}/purge-broken`);
      toast({ title: "Cleanup Successful", description: "All placeholder entries removed." });
      fetchData();
    } catch (err) {
      toast({ title: "Cleanup Failed", variant: "destructive" });
    } finally {
      setPurging(false);
    }
  };

  const handleSuperPurge = async () => {
    const pass = prompt("DANGER: This will wipe ALL candidate and campaign data. Enter 'RESET' to confirm:");
    if (pass !== 'RESET') return;
    
    setPurging(true);
    try {
      await api.delete('/campaigns/system/purge-all');
      toast({ title: "SYSTEM WIPED", description: "All data has been deleted. Starting from zero." });
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast({ title: "Reset Failed", variant: "destructive" });
    } finally {
      setPurging(false);
    }
  };

  const inviteIndividual = async (candidate: any) => {
    if (candidate.inviteSent) {
      const pass = prompt("Invitation already sent. Enter 'PASS' to re-invite manually:");
      if (pass !== 'PASS') return;
    }

    setInvitingIds(prev => new Set(prev).add(candidate.id));
    try {
      await api.post(`/campaigns/candidate/${candidate.id}/invite`, { customQuestions: [] });
      toast({ title: "Invitation Sent", description: `Link sent to ${candidate.email}` });
      fetchData(true);
    } catch (err) {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    } finally {
      setInvitingIds(prev => {
        const next = new Set(prev);
        next.delete(candidate.id);
        return next;
      });
    }
  };

  const promoteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    // Check if any selected candidate is missing a valid email
    const missingEmails = candidates.filter(c => selectedIds.includes(c.id) && (!c.email || c.email.includes('pending')));
    if (missingEmails.length > 0) {
       toast({ 
         title: "Missing Info", 
         description: `${missingEmails.length} candidates need emails before they can be invited.`,
         variant: "destructive" 
       });
       return;
    }

    setExtraQuestions(['']); // Reset questions
    setPromoteDialogOpen(true);
  };

  const confirmPromotion = async () => {
    setPromoting(true);
    try {
      const questions = extraQuestions.filter(q => q.trim().length > 0);
      await api.post(`/campaigns/${campaignId}/promote`, { 
        candidateIds: selectedIds,
        customQuestions: questions
      });
      toast({ 
        title: "Promotion Success", 
        description: `${selectedIds.length} candidates promoted and invited.` 
      });
      setSelectedIds([]);
      setPromoteDialogOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: "Promotion Failed", variant: "destructive" });
    } finally {
      setPromoting(false);
    }
  };

  if (loading) return (
     <div className="min-h-screen p-8 bg-transparent flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
        <p className="text-neutral-500 font-medium animate-pulse">Initializing Sourcing Pipeline...</p>
     </div>
  );

  const filtered = candidates.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] p-8 relative max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <Link href={`/dashboard/campaigns/${campaignId}`} className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm mb-4">
            <ChevronLeft size={16} /> Back to Campaign
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
            AI Sourcing <span className="text-violet-500">Pipeline</span>
          </h1>
          <p className="text-neutral-400 max-w-xl">
             Bulk upload resumes for your <b>{campaign?.title}</b> role. The AI will parse, extract, and rank them automatically.
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSuperPurge}
            className="text-[10px] text-red-500/50 hover:text-red-500 font-bold uppercase tracking-widest mt-2 px-0"
          >
            [ DANGER: Hard Reset System ]
          </Button>
        </div>

        <div className="flex gap-4">
           <label className={`relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all cursor-pointer ${uploading ? 'bg-white/5 opacity-50 pointer-events-none' : 'bg-gradient-to-br from-violet-600 to-indigo-600 hover:scale-[1.02] shadow-[0_0_30px_rgba(124,58,237,0.3)]'}`}>
             {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
             {uploading ? "Parsing..." : "Bulk Upload Resumes"}
             <input type="file" multiple accept=".pdf" className="hidden" onChange={onFileUpload} />
           </label>
        </div>
      </div>

      {/* Funnel Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
               <FileText size={24} />
            </div>
            <div>
               <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total Sourced</p>
               <h3 className="text-3xl font-black text-white">{candidates.length}</h3>
            </div>
         </div>
         <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
               <Trophy size={24} />
            </div>
            <div>
               <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Highly Aligned (80+)</p>
               <h3 className="text-3xl font-black text-white">{candidates.filter(c => (c.fitScore || 0) >= 80).length}</h3>
            </div>
         </div>
         <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
               <AlertCircle size={24} />
            </div>
             <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Action Required</p>
                <div className="flex items-center gap-3">
                  <h3 className="text-3xl font-black text-white">{candidates.filter(c => c.resumeAlignmentStatus === 'ERROR' || (!c.email || c.email.includes('pending'))).length}</h3>
                  {candidates.some(c => c.email?.includes('pending')) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handlePurge}
                      disabled={purging}
                      className="h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20"
                    >
                      {purging ? <Loader2 size={10} className="animate-spin" /> : "Purge Stale"}
                    </Button>
                  )}
                </div>
             </div>
          </div>
      </div>

      {/* Leaderboard Table Area */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
           <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <Input 
                placeholder="Search candidates..." 
                className="pl-12 bg-white/5 border-white/10 rounded-2xl focus:border-violet-500/50"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
           
           <AnimatePresence>
             {selectedIds.length > 0 && (
               <motion.div 
                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                 className="flex items-center gap-4 bg-violet-600 px-6 py-2 rounded-2xl shadow-[0_0_30px_rgba(124,58,237,0.4)]"
               >
                  <span className="text-sm font-bold text-white uppercase italic">{selectedIds.length} Selected</span>
                  <div className="h-6 w-px bg-white/20" />
                  <button 
                    onClick={promoteSelected}
                    className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-tighter hover:gap-3 transition-all"
                  >
                    Promote & Invite <ArrowRight size={16} />
                  </button>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.03]">
                <th className="px-6 py-5 w-16">
                   <div 
                     className={`w-5 h-5 rounded border border-white/20 flex items-center justify-center cursor-pointer transition-colors ${selectedIds.length === filtered.length && filtered.length > 0 ? 'bg-violet-500 border-violet-500' : ''}`}
                     onClick={() => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(c => c.id))}
                   >
                      {selectedIds.length === filtered.length && filtered.length > 0 && <CheckCircle2 size={12} className="text-white" />}
                   </div>
                </th>
                <th className="px-6 py-5 text-xs font-black text-neutral-500 uppercase tracking-widest">Candidate</th>
                <th className="px-6 py-5 text-xs font-black text-neutral-500 uppercase tracking-widest text-center">AI Fit Score</th>
                <th className="px-6 py-5 text-xs font-black text-neutral-500 uppercase tracking-widest">Status/Analysis</th>
                <th className="px-6 py-5 text-xs font-black text-neutral-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map((candidate) => {
                const isSelected = selectedIds.includes(candidate.id);
                const isParsing = candidate.resumeAlignmentStatus === 'PARSING';
                const needsEmail = !candidate.email || candidate.email.includes('pending@parse');
                
                let analysis = { reason: "Parsing result...", skills: [] };
                try { 
                  if (candidate.resumeAlignmentReason) analysis = JSON.parse(candidate.resumeAlignmentReason);
                } catch {}

                return (
                  <tr 
                    key={candidate.id} 
                    className={`group transition-all ${isSelected ? 'bg-violet-500/10' : 'hover:bg-white/[0.03]'}`}
                  >
                    <td className="px-6 py-5">
                       <div 
                         className={`w-5 h-5 rounded border border-white/20 flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-violet-500 border-violet-500' : 'group-hover:border-violet-500/50'}`}
                         onClick={() => setSelectedIds(prev => isSelected ? prev.filter(id => id !== candidate.id) : [...prev, candidate.id])}
                       >
                          {isSelected && <CheckCircle2 size={12} className="text-white" />}
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border ${isParsing ? 'animate-pulse bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-white/5 border-white/10 text-neutral-400'}`}>
                             {isParsing ? <Loader2 className="animate-spin w-4 h-4" /> : (candidate.name?.charAt(0) || "?")}
                          </div>
                          <div>
                             <p className="font-bold text-white capitalize">{candidate.name}</p>
                             <p className={`text-xs flex items-center gap-1 ${needsEmail ? 'text-red-400 font-bold italic' : 'text-neutral-500'}`}>
                                {needsEmail ? (
                                   <span className="flex items-center gap-1"><AlertCircle size={10} /> MISSING EMAIL</span>
                                ) : candidate.email}
                             </p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col items-center">
                          <div className={`text-2xl font-black ${candidate.fitScore >= 80 ? 'text-emerald-400' : candidate.fitScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                             {candidate.fitScore ?? "—"}
                          </div>
                          <div className="w-16 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                             <div 
                               className={`h-full transition-all duration-1000 ${candidate.fitScore >= 80 ? 'bg-emerald-500' : candidate.fitScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                               style={{ width: `${candidate.fitScore || 0}%` }}
                             />
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-5 max-w-xs">
                       {isParsing ? (
                         <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 animate-pulse">Analyzing Text...</Badge>
                       ) : (
                         <div className="space-y-2">
                           <p className="text-[11px] text-neutral-400 leading-tight italic">"{analysis.reason}"</p>
                           <div className="flex flex-wrap gap-1">
                              {analysis.skills?.slice(0, 3).map((s: string) => (
                                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-500 uppercase tracking-widest">{s}</span>
                              ))}
                           </div>
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingCandidate(candidate);
                              setNewEmail(needsEmail ? '' : candidate.email);
                              setEmailDialogOpen(true);
                            }}
                            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-violet-500/20 hover:text-violet-400 transition-all text-neutral-400 inline-flex items-center gap-2"
                          >
                            {needsEmail ? <UserPlus size={16} /> : <Edit2 size={16} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">{needsEmail ? "Set Email" : "Edit"}</span>
                          </button>

                          <button 
                            onClick={() => inviteIndividual(candidate)}
                            disabled={(candidate.inviteSent && !needsEmail) || invitingIds.has(candidate.id)}
                            className={`p-2 rounded-xl border transition-all inline-flex items-center gap-2 ${
                              invitingIds.has(candidate.id) ? 'opacity-50 cursor-not-allowed' :
                              candidate.inviteSent 
                                ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                                : 'bg-white/5 border-white/5 hover:bg-violet-500/20 hover:text-violet-400 text-neutral-400'
                            }`}
                          >
                            {invitingIds.has(candidate.id) ? <Loader2 className="animate-spin" size={16} /> :
                             candidate.inviteSent ? <CheckCircle2 size={16} /> : <Mail size={16} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {invitingIds.has(candidate.id) ? "SENDING..." : (candidate.inviteSent ? "RESENT" : "Invite")}
                            </span>
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-neutral-600">
                         <Search size={48} className="opacity-20" />
                         <p className="font-bold uppercase tracking-[0.2em] italic">No Sourced Profiles Found</p>
                         <p className="text-xs">Uplod PDFs to start your automated pipeline.</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Update Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="bg-slate-950/95 backdrop-blur-2xl border-white/10 text-white rounded-[2rem] max-w-md p-8">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                {editingCandidate?.email?.includes('pending') ? "Resolve Identity" : "Update Profile"}
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                AI extracted the profile for <b className="text-white">{editingCandidate?.name}</b> but needs {editingCandidate?.email?.includes('pending') ? "the email address" : "a new email"} to proceed carefully.
              </DialogDescription>
           </DialogHeader>
           
           <div className="py-6 space-y-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-violet-400 px-1">Primary Email Address</label>
                 <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <Input 
                      placeholder="e.g. candidate@domain.com"
                      className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:border-violet-500"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                    />
                 </div>
              </div>
           </div>

           <DialogFooter className="gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setEmailDialogOpen(false)}
                className="rounded-xl border border-white/5 hover:bg-white/5"
              >
                CANCEL
              </Button>
              <Button 
                onClick={handleUpdateEmail}
                disabled={updatingEmail || !newEmail}
                className="bg-violet-600 hover:bg-violet-700 text-white font-black uppercase rounded-xl px-8 shadow-lg shadow-violet-500/20"
              >
                {updatingEmail ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 size={16} className="mr-2" />}
                CONFIRM PROFILE
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Promotion Confirmation & Question Injection Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="bg-slate-950/95 backdrop-blur-2xl border-white/10 text-white rounded-[2rem] max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
           <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
                Launch <span className="text-violet-500">Interview Wave</span>
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                You are about to invite <b className="text-white">{selectedIds.length}</b> candidates. You can optionally inject custom technical questions for this specific batch.
              </DialogDescription>
           </DialogHeader>

           <div className="py-8 space-y-6">
              <div className="space-y-4">
                 <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase tracking-widest text-violet-400">
                      Injection: Admin Questions
                    </label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setExtraQuestions([...extraQuestions, ''])}
                      className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white"
                    >
                      + Add Question
                    </Button>
                 </div>
                 
                 <div className="space-y-3">
                    <AnimatePresence>
                      {extraQuestions.map((q, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex gap-3"
                        >
                           <Input 
                             placeholder={`Technical objective ${idx + 1}...`}
                             className="bg-white/5 border-white/10 rounded-xl focus:border-violet-500"
                             value={q}
                             onChange={(e) => {
                               const next = [...extraQuestions];
                               next[idx] = e.target.value;
                               setExtraQuestions(next);
                             }}
                           />
                           {extraQuestions.length > 1 && (
                             <Button 
                               variant="ghost" 
                               onClick={() => setExtraQuestions(extraQuestions.filter((_, i) => i !== idx))}
                               className="hover:text-red-400"
                             >
                               ×
                             </Button>
                           )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
              </div>

              <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                 <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-medium leading-relaxed">
                   <AlertCircle size={12} className="inline mr-2 text-amber-500" />
                   Confirming will send personalized interview links to all selected candidates. Statuses will update globally as "INVITED".
                 </p>
              </div>
           </div>

           <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setPromoteDialogOpen(false)}
                className="rounded-xl border border-white/5"
              >
                BACK
              </Button>
              <Button 
                onClick={confirmPromotion}
                disabled={promoting}
                className="bg-violet-600 hover:bg-violet-700 text-white font-black uppercase rounded-xl px-12 shadow-xl shadow-violet-600/20"
              >
                {promoting ? <Loader2 className="animate-spin mr-3" /> : <CheckCircle2 size={18} className="mr-3" />}
                SEND & START INTERVIEWS
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
