"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  MessageSquare, 
  Zap, 
  ShieldAlert, 
  ChevronLeft, 
  Download,
  CheckCircle2,
  AlertCircle,
  FileWarning,
  Info
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import api from '@/lib/api';

export default function CandidateResultPage() {
  const { candidateId } = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await api.get(`/campaigns/candidate/${candidateId}`);
        setCandidate(data);
      } catch (error) {
        console.error('Failed to fetch results', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [candidateId]);

  if (loading) return (
    <div className="min-h-[calc(100vh-5rem)] p-8 relative w-full bg-transparent">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
          <div className="space-y-4">
            <div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse backdrop-blur-xl border border-white/10" />
            <div className="h-4 w-96 bg-white/5 rounded-md animate-pulse backdrop-blur-xl border border-white/10" />
          </div>
          <div className="flex gap-3">
            <div className="w-32 h-12 bg-white/5 rounded-full animate-pulse backdrop-blur-xl border border-white/10" />
            <div className="w-12 h-12 bg-white/5 rounded-full animate-pulse backdrop-blur-xl border border-white/10" />
          </div>
        </div>

        {/* Overview Stats Block */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 md:col-span-2 h-44 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl animate-pulse p-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 mb-4" />
            <div className="h-4 w-1/2 bg-white/5 rounded mb-2" />
            <div className="h-3 w-1/3 bg-white/5 rounded" />
          </div>
          {[1, 2].map(i => (
             <div key={i} className="h-44 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl animate-pulse p-6">
               <div className="w-12 h-12 rounded-xl bg-white/10 mb-6" />
               <div className="h-6 w-20 bg-white/10 rounded mb-2" />
               <div className="h-3 w-2/3 bg-white/5 rounded" />
             </div>
          ))}
        </div>

        {/* Summary Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl animate-pulse p-6 space-y-4">
             <div className="h-6 w-32 bg-white/10 rounded" />
             <div className="h-3 w-full bg-white/5 rounded" />
             <div className="h-3 w-full bg-white/5 rounded" />
             <div className="h-3 w-3/4 bg-white/5 rounded" />
          </div>
          <div className="h-64 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl animate-pulse p-6 space-y-4">
             <div className="h-6 w-32 bg-white/10 rounded" />
             <div className="h-3 w-full bg-white/5 rounded" />
             <div className="h-3 w-full bg-white/5 rounded" />
             <div className="h-3 w-1/2 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!candidate) return <div className="p-8 text-neutral-500">Result not found</div>;

  const session = candidate.session;
  const resume = candidate.resume;
  
  const isMisaligned = candidate.resumeAlignmentStatus === 'MISALIGNED';
  const isPending = candidate.resumeAlignmentStatus === 'PENDING';

  return (
    <div className="min-h-[calc(100vh-5rem)] p-8 relative overflow-hidden text-white bg-transparent">
      {/* Ambient blobs removed — handled by global layout.tsx */}

      <div className="relative z-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Top Actions */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
            Back to Campaign
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <Download size={16} />
            Export PDF Report
          </button>
        </div>

        {/* ── ALIGNMENT WARNING ── */}
        {(isMisaligned || isPending) && (
          <div className={`p-6 rounded-3xl border flex items-start gap-4 backdrop-blur-xl animate-in slide-in-from-top-4 ${
            isMisaligned 
              ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)]' 
              : 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.1)]'
          }`}>
            <div className={`p-3 rounded-2xl ${isMisaligned ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {isMisaligned ? <FileWarning size={28} /> : <AlertCircle size={28} />}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${isMisaligned ? 'text-red-400' : 'text-yellow-400'}`}>
                {isMisaligned ? 'SEVERE: Resume Alignment Mismatch' : 'Resume Alignment Pending'}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-white/80">
                {isMisaligned 
                  ? `Warning! The candidate's resume does not match the required Campaign Profile (${candidate.campaign?.title}). Reason: ${candidate.resumeAlignmentReason}`
                  : `Waiting for the candidate to upload their resume before the interview begins.`}
              </p>
            </div>
          </div>
        )}

        {/* Profile Header Glass Card */}
        <div className="flex flex-col md:flex-row gap-6 items-stretch">
          <div className="flex-1 p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-extrabold tracking-tight text-white">{candidate.name}</h1>
              <Badge className={`px-3 py-1 text-xs uppercase tracking-widest ${
                session?.recommendation === 'STRONG_HIRE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                session?.recommendation === 'CONSIDER' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                session?.recommendation === 'PENDING' ? 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {session?.recommendation || 'PENDING'}
              </Badge>
            </div>
            <p className="text-neutral-400 mt-2">{candidate.email} • ID: {candidate.id}</p>
            
            <div className="flex gap-4 mt-8">
              <div className="px-5 py-3 bg-black/40 border border-white/5 rounded-2xl">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block mb-1">Overall Score</span>
                <span className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {session?.overallScore?.toFixed(1) || '0.0'}/10
                </span>
              </div>
              <div className="px-5 py-3 bg-black/40 border border-white/5 rounded-2xl w-full max-w-[200px]">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block mb-1">Resume Match</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity flex items-center justify-center gap-2 group">
                      {resume?.skillMatchPercentage || 0}%
                      <Info size={16} className="text-violet-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="border border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto" style={{ background: 'rgba(10,8,30,0.95)', backdropFilter: 'blur(40px)' }}>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl text-violet-400">
                        <MessageSquare size={20} />
                        Resume Alignment Report
                      </DialogTitle>
                      <DialogDescription className="text-neutral-400">
                        Detailed AI breakdown of the candidate's professional profile vs campaign requirements.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 mt-4">
                      {/* Overall Status */}
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                         <div>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 block">Overall Alignment Status</span>
                            <span className={`text-lg font-bold ${isMisaligned ? 'text-red-400' : isPending ? 'text-yellow-400' : 'text-emerald-400'}`}>
                              {candidate.resumeAlignmentStatus}
                            </span>
                         </div>
                         <div className="text-right">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 block">Skill Match Score</span>
                            <span className="text-2xl font-black text-violet-400">{resume?.skillMatchPercentage || 0}%</span>
                         </div>
                      </div>
                      
                      {/* Detailed Reason */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-violet-300 mb-2">Automated Reason</h4>
                        <div className={`p-4 rounded-xl text-sm leading-relaxed border ${isMisaligned ? 'bg-red-500/10 border-red-500/20 text-red-100' : 'bg-black/30 border-white/5 text-neutral-300'}`}>
                          {candidate.resumeAlignmentReason || 'Waiting for resume processing.'}
                        </div>
                      </div>

                      {/* Extracted Text snippet */}
                      {resume?.extractedText && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-2">Raw Extracted Key Data</h4>
                          <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-xs text-neutral-400 font-mono h-48 overflow-y-auto whitespace-pre-wrap">
                            {resume.extractedText}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Anti-Cheat Glass Panel */}
          <div className="w-full md:w-80 p-6 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 mb-6">
                <ShieldAlert size={16} className={session?.antiCheatFlag ? "text-red-500" : "text-emerald-500"} />
                Proctoring Logic
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                  <span className="text-neutral-300">Tab Switches</span>
                  <span className={`font-bold ${session?.antiCheatLogs?.filter((l:any) => l.type === 'TAB_SWITCH').length > 0 ? "text-red-400" : "text-white"}`}>
                    {session?.antiCheatLogs?.filter((l:any) => l.type === 'TAB_SWITCH').length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                  <span className="text-neutral-300">Fullscreen Exits</span>
                  <span className={`font-bold ${session?.antiCheatLogs?.filter((l:any) => l.type === 'EXIT_FULLSCREEN').length > 0 ? "text-red-400" : "text-white"}`}>
                    {session?.antiCheatLogs?.filter((l:any) => l.type === 'EXIT_FULLSCREEN').length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pb-1">
                  <span className="text-neutral-300">Camera / Face Losses</span>
                  <span className={`font-bold ${session?.antiCheatLogs?.filter((l:any) => l.type === 'FACE_LOST').length > 0 ? "text-red-400 animate-pulse" : "text-white"}`}>
                    {session?.antiCheatLogs?.filter((l:any) => l.type === 'FACE_LOST').length || 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-4 mt-2">
              {session?.antiCheatFlag ? (
                <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                  <AlertCircle size={14} /> Integrity Compromised
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 size={14} /> Clear Session
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Drill-down (Questions) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <BarChart3 size={24} className="text-violet-400" />
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                Interview Performance
              </h2>
            </div>
            
            <div className="space-y-6">
              {session?.questions?.map((q: any, i: number) => (
                <div key={q.id} className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl transition-all hover:bg-white/[0.04]">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-semibold text-lg text-white/90 leading-relaxed pr-6">
                      <span className="text-violet-400 mr-2">Q{i+1}.</span>{q.text}
                    </h3>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 drop-shadow-lg flex-shrink-0">
                      {q.answer?.overallScore?.toFixed(1) || '0.0'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <ScoreDetail label="Technical" score={q.answer?.technicalScore} color="#34d399" />
                    <ScoreDetail label="Depth" score={q.answer?.depthScore} color="#38bdf8" />
                    <ScoreDetail label="Communication" score={q.answer?.communicationScore} color="#fcd34d" />
                  </div>

                  <div className="p-5 rounded-2xl bg-black/50 border border-white/5">
                    <p className="text-sm italic text-neutral-400 leading-relaxed">
                      "{q.answer?.transcript || "No transcript recorded for this question."}"
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 mt-5 border-t border-white/5">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 block mb-3 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Strengths
                        </span>
                        <ul className="text-sm text-neutral-300 space-y-2">
                          {q.answer?.strengths?.length > 0 ? q.answer.strengths.map((s: string) => <li key={s} className="leading-snug">• {s}</li>) : <li className="text-neutral-600">None detected.</li>}
                        </ul>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-red-400 block mb-3 flex items-center gap-1">
                          <AlertCircle size={12} /> Weaknesses
                        </span>
                        <ul className="text-sm text-neutral-300 space-y-2">
                          {q.answer?.weaknesses?.length > 0 ? q.answer.weaknesses.map((w: string) => <li key={w} className="leading-snug">• {w}</li>) : <li className="text-neutral-600">None detected.</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!session?.questions || session.questions.length === 0) && (
                <div className="p-12 text-center text-neutral-500 border border-white/5 rounded-3xl">
                  No questions evaluated yet.
                </div>
              )}
            </div>
          </div>

          {/* Right Side Info Panels */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare size={24} className="text-blue-400" />
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                AI Diagnostics
              </h2>
            </div>
            
            <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-2xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-3">Profile Summary</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                {resume?.summary || (isPending ? "Waiting for resume upload to generate summary." : "No profile summary available.")}
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-2xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                <Zap size={14} /> Matched Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {candidate.campaign?.requiredSkills?.map((skill: string) => (
                  <Badge key={skill} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1">
                    {skill}
                  </Badge>
                ))}
              </div>

              <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-400 mt-8 mb-4 flex items-center gap-2">
                <AlertCircle size={14} /> Potential Concerns
              </h3>
              <ul className="text-sm text-neutral-300 space-y-3">
                {resume?.missingSkills?.length > 0 ? (
                  resume.missingSkills.map((ms: string) => (
                    <li key={ms} className="flex items-start gap-2 text-red-300/80">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                      Lacks demonstrated experience in {ms}.
                    </li>
                  ))
                ) : (
                  <li className="text-neutral-500 text-xs italic">No immediate red flags detected in technical stack.</li>
                )}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ScoreDetail({ label, score, color }: any) {
  return (
    <div className="text-center p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden group">
      {/* Dynamic glow based on score magnitude */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" 
        style={{ background: `radial-gradient(circle at center, ${color}, transparent 70%)` }} 
      />
      <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold block mb-2">{label}</span>
      <span className="text-2xl font-black drop-shadow-md" style={{ color: color }}>{score || 0}<span className="text-sm text-neutral-500 opacity-50 font-normal">/10</span></span>
    </div>
  );
}
