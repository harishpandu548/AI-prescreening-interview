"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Upload, CheckCircle, ShieldAlert, FileText, Camera, Mic, ShieldCheck, Monitor, AlertCircle, Play, Sparkles, Clock, XCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

export default function UnifiedInterviewEntry() {
  const { token } = useParams();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [checks, setChecks] = useState({
    camera: false,
    mic: false,
    fullscreen: false,
  });
  const [isMisaligned, setIsMisaligned] = useState(false);
  const [misalignmentReason, setMisalignmentReason] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Validate Token and Check State
  useEffect(() => {
    const validate = async () => {
      try {
        const { data } = await api.get(`/interviews/validate/${token}`);
        setCandidate(data);
        
        if (data.resumeAlignmentStatus === 'MISALIGNED') {
          setIsMisaligned(true);
          setMisalignmentReason(data.resumeAlignmentReason);
          return;
        }

        // If candidate already has a resume, we can try to get permissions immediately
        if (data.resume) {
          requestPermissions();
        }
      } catch (error: any) {
        if (error.response?.data?.message === 'Interview link expired') {
          setIsExpired(true);
        } else if (error.response?.data?.message?.includes('not eligible')) {
          setIsMisaligned(true);
          setMisalignmentReason(error.response.data.message);
        } else {
          toast({ 
            title: "Session Error", 
            description: error.response?.data?.message || "Invalid or expired link.", 
            variant: "destructive" 
          });
          router.push('/');
        }
      } finally {
        setLoading(false);
      }
    };
    validate();

    const handleFullscreenChange = () => {
      setChecks(prev => ({ ...prev, fullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [token, router]);

  const requestPermissions = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setChecks(prev => ({ ...prev, camera: true, mic: true }));
    } catch (error) {
      toast({ title: "HW Check Failed", description: "Camera/Mic access is required.", variant: "destructive" });
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('candidateId', candidate.id);
      
      const { data: uploadRes } = await api.post('/interviews/resume', formData);
      
      if (uploadRes.isMisaligned) {
        setIsMisaligned(true);
        setMisalignmentReason(uploadRes.reason);
        toast({ title: "Eligibility Check Failed", description: "Your resume does not match the role requirements.", variant: "destructive" });
        return;
      }

      toast({ title: "Profile Identified", description: "Analyzing technical profile..." });
      
      // Re-fetch candidate to update state with resume
      const { data } = await api.get(`/interviews/validate/${token}`);
      setCandidate(data);
      requestPermissions();
    } catch (error) {
      toast({ title: "Identification Failed", description: "Failed to process profile.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    }
  };

  const startInterview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    router.push(`/interview/${token}/room`);
  };

  // ── Background & Ambient Wrappers ──
  const BackgroundMesh = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#0a0514]">
      <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[150px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[150px]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgyMHYyMEgxeiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-40" />
    </div>
  );

  // ── States Rendering ──

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white relative">
      <BackgroundMesh />
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm animate-pulse">Establishing Secure Connection</p>
      </motion.div>
    </div>
  );

  if (isExpired) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white relative">
      <BackgroundMesh />
      <motion.div 
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, type: 'spring' }}
        className="relative z-10 max-w-lg w-full p-1"
      >
        <div className="bg-red-950/20 backdrop-blur-3xl border border-red-500/20 rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
          >
            <Clock size={32} className="text-red-400" />
          </motion.div>
          <h1 className="text-3xl font-black text-white mb-2">Time Expired</h1>
          <p className="text-neutral-400 mb-8 leading-relaxed">
            The 48-hour access window for this interview token has elapsed. You can no longer access this session.
          </p>
          <p className="text-xs font-bold tracking-widest uppercase text-red-400 bg-red-500/10 py-2.5 rounded-xl border border-red-500/20 inline-block px-6">
            Session Locked
          </p>
        </div>
      </motion.div>
    </div>
  );

  if (isMisaligned) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white relative">
      <BackgroundMesh />
      <motion.div 
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, type: 'spring' }}
        className="relative z-10 max-w-lg w-full p-1"
      >
        <div className="bg-amber-950/20 backdrop-blur-3xl border border-amber-500/20 rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
          >
            <XCircle size={32} className="text-amber-400" />
          </motion.div>
          <h1 className="text-3xl font-black text-white mb-2">Not Eligible</h1>
          <p className="text-neutral-400 mb-8 leading-relaxed">
            {misalignmentReason || "Based on your resume analysis, your background does not align with the domain requirements for this position."}
          </p>
          <div className="space-y-4">
            <p className="text-xs font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 py-2.5 rounded-xl border border-amber-500/20 inline-block px-6">
              Domain Mismatch Detected
            </p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">The administrator has been notified of this mismatch.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const showSecurityCheck = !!candidate?.resume;
  const allChecksPassed = checks.camera && checks.mic && checks.fullscreen;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <BackgroundMesh />
      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Info Area */}
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.15)]">
              <Sparkles size={12} /> {candidate?.campaign?.title}
            </div>
            <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-neutral-400">
              {showSecurityCheck ? "Security Calibration" : "Identity Verification"}
            </h1>
            <p className="text-neutral-400 text-lg leading-relaxed font-medium">
              {showSecurityCheck 
                ? `Welcome back, ${candidate.name}. Complete the strict hardware protocol check to enter the interview room.`
                : "Welcome. Please upload your valid Resume/CV. AI will verify your identity and generate your personalized technical perimeter."}
            </p>
          </div>

          {!showSecurityCheck ? (
            /* Upload Block Glassmorphic */
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 relative shadow-2xl">
              <div 
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                  file ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_30px_rgba(124,58,237,0.1)]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                }}
              >
                {!file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/[0.03] border border-white/5 rounded-full flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-neutral-400" />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">Drag & Drop Resume PDF</p>
                    <p className="text-xs text-neutral-500">or click to browse local files</p>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-violet-400" />
                    <p className="text-sm font-bold text-white">{file.name}</p>
                    <p className="text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button 
                      onClick={() => setFile(null)}
                      className="text-xs font-bold uppercase tracking-widest text-red-400 mt-2 hover:text-red-300 transition-colors"
                    >
                      Remove File
                    </button>
                  </div>
                )}
              </div>
              <button 
                className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:scale-[1.02] active:scale-100"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                disabled={!file || uploading} 
                onClick={handleFileUpload}
              >
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Processing AI Verify...</>
                ) : (
                  <>Submit & Generate Profile</>
                )}
              </button>
            </motion.div>
          ) : (
            /* Proctoring Hardware Check Glassmorphic */
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
               {[
                 { id: 'camera', label: 'Facial Camera Link', icon: Camera, status: checks.camera, action: requestPermissions },
                 { id: 'mic', label: 'Audio Telemetry', icon: Mic, status: checks.mic, action: requestPermissions },
                 { id: 'fullscreen', label: 'Strict Fullscreen', icon: Monitor, status: checks.fullscreen, action: toggleFullscreen },
               ].map((check, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + (i * 0.1) }}
                    key={check.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${check.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>
                        <check.icon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{check.label}</p>
                        <p className="text-xs text-neutral-500">{check.status ? 'Secured' : 'Awaiting Authorization'}</p>
                      </div>
                    </div>
                    {check.status ? (
                      <CheckCircle className="text-emerald-400" size={20} />
                    ) : (
                      <button 
                        onClick={check.action} 
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                      >
                        Enable
                      </button>
                    )}
                  </motion.div>
               ))}

               <button 
                  className={`w-full mt-6 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold text-white transition-all duration-300 ${allChecksPassed ? 'shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.02]' : 'opacity-50 cursor-not-allowed grayscale'}`}
                  style={{ background: allChecksPassed ? 'linear-gradient(135deg, #10b981, #059669)' : '#262626' }}
                  disabled={!allChecksPassed}
                  onClick={startInterview}
                >
                  <Play size={18} fill="currentColor" />
                  {allChecksPassed ? "INITIALIZE INTERVIEW" : "AWAITING CALIBRATION"}
               </button>
            </motion.div>
          )}
        </motion.div>

        {/* Right Aspect: Camera Preview or Brand Visual */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative h-full min-h-[500px]">
          {showSecurityCheck ? (
            <div className="absolute inset-0 rounded-3xl bg-black/40 border border-white/5 overflow-hidden backdrop-blur-2xl">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-violet-500/5 pointer-events-none z-10 mix-blend-overlay" />
               <video 
                 ref={videoRef} 
                 autoPlay playsInline muted 
                 className={`w-full h-full object-cover transition-all duration-700 ${checks.camera ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
               />
               {!checks.camera && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <ShieldCheck size={48} className="text-neutral-700 mb-4" />
                   <p className="text-sm font-bold tracking-widest uppercase text-neutral-600">Camera Offline</p>
                 </div>
               )}
               <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-end">
                 <div className="space-y-1">
                   <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Telemetry
                   </p>
                   <p className="text-xs text-white/50 font-mono">ID: {candidate.id.split('-')[0]}</p>
                 </div>
                 {allChecksPassed && (
                   <kbd className="px-3 py-1.5 rounded bg-black/50 border border-white/20 text-[10px] text-white/70 font-mono backdrop-blur-md">
                     SYSTEM_READY
                   </kbd>
                 )}
               </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col justify-center gap-8 pl-12 lg:border-l border-white/5 relative z-10">
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex flex-shrink-0 items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                    <ShieldAlert size={20} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">Zero-Tolerance AI Proctoring</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">Our military-grade monitoring system utilizes active facial recognition and strictly enforces a locked fullscreen environment.</p>
                  </div>
               </motion.div>
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-shrink-0 items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                    <FileText size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">Dynamic Persona Generation</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">Questions are mapped dynamically to your parsed resume data natively validating your exact skills vs the campaign targets.</p>
                  </div>
               </motion.div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
