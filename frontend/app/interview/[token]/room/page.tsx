"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Mic, MicOff, Volume2, Timer, AlertTriangle, Send, Loader2,
  ShieldAlert, CheckCircle, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import * as faceapi from '@vladmandic/face-api';

type SttState = 'idle' | 'starting' | 'running' | 'stopping';

export default function InterviewRoomPage() {
  const { token } = useParams();
  const router = useRouter();

  const [candidate, setCandidate] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // STT / Recording
  const [sttState, setSttState] = useState<SttState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Face Detection / Proctoring
  const [faceapiLoaded, setFaceapiLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [faceWarningVisible, setFaceWarningVisible] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<any>(null);
  const faceFrameRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const noFaceFramesCounter = useRef(0);

  // Stable refs for async callbacks
  const isRecordingRef = useRef(false);
  const sessionRef = useRef<any>(null);
  const questionsRef = useRef<any[]>([]);
  const currentIdxRef = useRef(0);
  const transcriptRef = useRef('');
  const candidateRef = useRef<any>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { candidateRef.current = candidate; }, [candidate]);

  // ─── Face API Initialization ──────────────────────────────────────
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        setFaceapiLoaded(true);
      } catch (err) {
        console.error("FaceAPI load error:", err);
      }
    };
    loadModels();
    return () => {
      if (faceFrameRef.current) cancelAnimationFrame(faceFrameRef.current);
    };
  }, []);

  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current || !faceapiLoaded || videoRef.current.paused || videoRef.current.ended) {
      if (videoRef.current && !videoRef.current.paused) faceFrameRef.current = requestAnimationFrame(detectFace);
      return;
    }

    try {
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      if (displaySize.width === 0) {
        faceFrameRef.current = requestAnimationFrame(detectFace);
        return;
      }
      
      const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }));
      
      const canvas = canvasRef.current;
      faceapi.matchDimensions(canvas, displaySize);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections) {
        setFaceDetected(true);
        noFaceFramesCounter.current = 0;
        setFaceWarningVisible(false);
        const resized = faceapi.resizeResults(detections, displaySize);
        // Draw green custom box
        if (ctx) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Emerald
          ctx.lineWidth = 3;
          ctx.strokeRect(resized.box.x, resized.box.y, resized.box.width, resized.box.height);
          
          // Draw corners
          const w = 15;
          ctx.beginPath();
          ctx.moveTo(resized.box.x, resized.box.y + w);
          ctx.lineTo(resized.box.x, resized.box.y);
          ctx.lineTo(resized.box.x + w, resized.box.y);
          ctx.stroke();
        }
      } else {
        noFaceFramesCounter.current += 1;
        if (noFaceFramesCounter.current > 30) { // Approx 1 second of missing face
          setFaceDetected(false);
          setFaceWarningVisible(true);
          if (ctx) {
            // Draw red hue over entire canvas
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
    } catch (err) {}

    faceFrameRef.current = requestAnimationFrame(detectFace);
  };

  useEffect(() => {
    if (hasStarted && faceapiLoaded) {
      detectFace();
    }
  }, [hasStarted, faceapiLoaded]);

  // ─── Setup Speech Recognition ─────────────────────────────────────
  const setupSpeech = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.maxAlternatives = 1;

    r.onstart = () => { setSttState('running'); };

    r.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) setTranscript(prev => prev + final);
      setInterimText(interim);
    };

    r.onerror = (e: any) => {
      if (e.error === 'no-speech') { setSttState('idle'); return; }
      setSttState('idle');
    };

    r.onend = () => {
      setSttState('idle');
      setInterimText('');
      if (isRecordingRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); setSttState('starting'); } catch {}
          }
        }, 300);
      }
    };

    recognitionRef.current = r;
  }, []);

  // ─── Audio Visualizer ─────────────────────────────────────────────
  const startVisualizer = (s: MediaStream) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      analyserRef.current = an;

      const tick = () => {
        if (!analyserRef.current) return;
        const arr = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(arr);
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        setAudioLevel(avg / 128);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  };

  // ─── Init ─────────────────────────────────────────────────────────
  useEffect(() => {
    let poll: any;
    const init = async () => {
      try {
        const { data: cand } = await api.get(`/interviews/validate/${token}`);
        setCandidate(cand);

        const { data: sess } = await api.post('/interviews/start', { candidateId: cand.id });
        setSession(sess);
        setQuestions(sess?.questions || []);
        setTimeLeft(cand.campaign?.timePerQuestion || 120);

        if (!sess?.questions?.length) {
          poll = setInterval(async () => {
            try {
              const { data: fresh } = await api.post('/interviews/start', { candidateId: cand.id });
              if (fresh?.questions?.length) { setQuestions(fresh.questions); clearInterval(poll); }
            } catch {}
          }, 3000);
        }

        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        startVisualizer(s);
        setupSpeech();
      } catch {
        toast({ title: "Setup Error", description: "Could not initialize session", variant: "destructive" });
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => {
      if (poll) clearInterval(poll);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [token]);

  useEffect(() => {
    if (!loading && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [loading]);

  // ─── Proctoring / Anti-Cheat / Tab Closure ───────────────────────
  useEffect(() => {
    if (!session?.id || !hasStarted) return;
    const log = (type: string) => api.post('/interviews/anti-cheat', { sessionId: sessionRef.current?.id, type }).catch(() => {});
    
    // Tab closure / Navigation away detection
    const handleTerminate = () => {
      if (!sessionRef.current?.id || hasCompletedRef.current) return;
      // Using sendBeacon for maximum reliability during tab closure/page hide
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/interviews/terminate/${sessionRef.current.id}`;
      navigator.sendBeacon(url);
    };

    const onVis = () => { 
      if (document.visibilityState === 'hidden') { 
        log('TAB_SWITCH'); 
        toast({ title: "⚠️ Warning", description: "Tab switch logged.", variant: "destructive" }); 
      } 
    };
    const onFS = () => { 
      if (!document.fullscreenElement) { 
        log('EXIT_FULLSCREEN'); 
        toast({ title: "⚠️ Warning", description: "Exiting fullscreen is logged.", variant: "destructive" }); 
      } 
    };

    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFS);
    window.addEventListener('pagehide', handleTerminate);

    return () => { 
      document.removeEventListener('visibilitychange', onVis); 
      document.removeEventListener('fullscreenchange', onFS); 
      window.removeEventListener('pagehide', handleTerminate);
      handleTerminate(); // Ensure cleanup on component unmount
    };
  }, [session?.id, hasStarted]);

  // When face gets lost during interview, explicitly log it maybe?
  useEffect(() => {
    if (hasStarted && faceWarningVisible && sessionRef.current) {
      api.post('/interviews/anti-cheat', { sessionId: sessionRef.current.id, type: 'FACE_LOST' }).catch(()=>{});
    }
  }, [faceWarningVisible, hasStarted]);

  // ─── Question TTS ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted || loading || !questions[currentIdx]) return;
    window.speechSynthesis.cancel();
    const ut = new SpeechSynthesisUtterance(questions[currentIdx].text);
    ut.rate = 0.9;
    ut.onstart = () => setIsSpeaking(true);
    ut.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(ut);
  }, [currentIdx, loading, hasStarted]);

  // ─── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted || loading || !questions.length || isSpeaking) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIdx, loading, hasStarted, isSpeaking]);

  // ─── Start ─────────────────────────────────────────────────────────
  const handleStart = () => {
    setHasStarted(true);
    document.documentElement.requestFullscreen().catch(() => {});
    startRecording();
  };

  const startRecording = async () => {
    setTranscript('');
    setInterimText('');
    audioChunksRef.current = [];

    const s = streamRef.current;
    if (!s) return;
    const audioTracks = s.getAudioTracks();
    if (!audioTracks.length) return;

    try {
      const audioStream = new MediaStream([audioTracks[0]]);
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = new MediaRecorder(audioStream, mime ? { mimeType: mime } : {});
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      if (recognitionRef.current && sttState === 'idle') {
        try { recognitionRef.current.start(); setSttState('starting'); } catch {}
      }
    } catch (err: any) {}
  };

  const stopRecording = (): Promise<Blob[]> => new Promise(resolve => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    setSttState('idle');
    setInterimText('');

    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.onstop = () => { setIsRecording(false); resolve([...audioChunksRef.current]); };
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      resolve([...audioChunksRef.current]);
    }
  });

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    const sess = sessionRef.current;
    const qs = questionsRef.current;
    const idx = currentIdxRef.current;
    if (!sess || !qs[idx]) return;

    if (timerRef.current) clearInterval(timerRef.current);
    const finalChunks = await stopRecording();
    const finalTranscript = transcriptRef.current.trim();
    
    // STRICT Check: if they typed nothing AND recorded nothing.
    if (!finalTranscript && finalChunks.length === 0) {
      toast({ title: "⚠️ No Answer Detected", description: "Please speak your answer before submitting.", variant: "destructive" });
      startRecording();
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('sessionId', sess.id);
      formData.append('questionId', qs[idx].id);
      formData.append('transcript', finalTranscript);
      if (finalChunks.length > 0) {
        formData.append('audio', new Blob(finalChunks, { type: 'audio/webm' }), 'answer.webm');
      }

      await api.post('/interviews/answer', formData);
      toast({ title: "✅ Submitted", description: "Response accepted." });

      if (idx < qs.length - 1) {
        setCurrentIdx(idx + 1);
        setTranscript('');
        setInterimText('');
        audioChunksRef.current = [];
        setTimeLeft(candidateRef.current?.campaign?.timePerQuestion || 120);
        setTimeout(() => { if (!isRecordingRef.current) startRecording(); }, 500);
      } else {
        hasCompletedRef.current = true;
        await api.post(`/interviews/complete/${sess.id}`);
        router.push('/interview/completed');
      }
    } catch {
      toast({ title: "Submit Error", description: "Failed to submit.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, router]);

  const timerColor = timeLeft < 30 ? '#ef4444' : timeLeft < 60 ? '#f59e0b' : '#8b5cf6';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0514' }}>
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[150px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[150px]" />
      </div>
      <Loader2 className="animate-spin text-violet-500 z-10" size={40} />
    </div>
  );

  if (!questions.length) return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden text-white" style={{ background: '#0a0514' }}>
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[150px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[150px]" />
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgyMHYyMEgxeiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-40" />
      </div>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4 relative z-10">
        <AlertTriangle size={40} className="mx-auto text-violet-500 animate-pulse" />
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400">Processing Artificial Intelligence Sequence...</h2>
        <p className="text-neutral-400 max-w-sm mx-auto text-sm">Please wait while the AI analyzes your resume and constructs your dedicated technical evaluation matrix.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden" style={{ background: '#0a0514' }}>
      {/* Overlay blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/30 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgyMHYyMEgxeiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-40" />
      </div>

      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-2xl bg-[#0a0514]/90"
          >
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} transition={{ type: 'spring' }} className="text-center max-w-md p-10 rounded-3xl border border-white/10 bg-black/40 shadow-2xl shadow-violet-500/10 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-violet-600/20 to-blue-600/20 border border-violet-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                <Mic size={36} className="text-violet-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">AI Interview Ready</h1>
                <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-2">Strict Evaluation Mode</p>
              </div>
              <div className="text-sm text-neutral-400 space-y-3 text-left bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                <p className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-500" /> Proctoring active (Camera & Fullscreen)</p>
                <p className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-500" /> Voice recording is heavily scrutinized</p>
                <p className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-500" /> Read questions aloud mechanically</p>
                {!faceapiLoaded && <p className="flex items-center gap-3 text-yellow-500 animate-pulse font-mono tracking-wider text-xs bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20 mt-4"><Loader2 size={14} className="animate-spin" /> LOADING_FACIAL_TRACKING_MODEL...</p>}
              </div>
              <button
                onClick={handleStart}
                disabled={!faceapiLoaded}
                className="w-full h-12 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] disabled:opacity-50"
              >
                {faceapiLoaded ? 'Start the Interview' : 'Please wait...'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-10 px-6 py-4 flex justify-between items-center bg-white/[0.01] border-b border-white/[0.05]">
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i < currentIdx ? 'w-6 bg-emerald-500' : i === currentIdx ? 'w-10 bg-violet-500 shadow-[0_0_10px_#8b5cf6]' : 'w-4 bg-white/10'}`} />
          ))}
        </div>
        <div className={`flex items-center gap-2 border px-4 py-1.5 rounded-xl ${timeLeft < 30 ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 bg-black/20'}`}>
          <Timer size={14} color={timerColor} />
          <span className="font-mono font-bold text-lg tabular-nums" style={{ color: timerColor }}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex gap-6 p-6 min-h-0">
        
        {/* Left Side: Question & Answers */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="rounded-3xl p-8 bg-white/[0.02] border border-white/[0.05] relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-violet-500/10 to-transparent pointer-events-none" />
            
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Question {currentIdx + 1}
            </span>
            <h2 className="mt-4 text-2xl font-semibold leading-relaxed text-white">
              {questions[currentIdx]?.text}
            </h2>
            {isSpeaking && (
              <p className="mt-4 flex items-center gap-2 text-xs text-violet-400 font-medium tracking-wide animate-pulse">
                <Volume2 size={14} /> Reading out loud...
              </p>
            )}
          </div>

          <div className="flex-1 rounded-3xl p-6 bg-black/40 border border-white/[0.05] flex flex-col backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]' : 'bg-neutral-600'}`} />
                <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                  {isRecording ? 'Recording Answer' : 'Microphone Standby'}
                </span>
              </div>
              <div className="flex gap-0.5 h-6 w-24 items-end justify-center">
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-violet-500"
                    animate={{ height: isRecording ? Math.max(4, audioLevel * 30 * Math.random()) : 4 }}
                    transition={{ type: 'tween', duration: 0.1 }}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] text-white/90">
              {transcript || interimText ? (
                <p className="leading-relaxed">
                  {transcript} <span className="text-violet-400 opacity-60 italic">{interimText}</span>
                </p>
              ) : (
                <p className="text-neutral-500 italic text-sm">Your answer will be transcribed here as you speak. Speak clearly into the microphone.</p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={isRecording ? () => stopRecording().then(() => setIsRecording(false)) : startRecording}
                disabled={isSpeaking}
                className={`flex-1 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'} disabled:opacity-50`}
              >
                {isRecording ? <><MicOff size={20} /> Stop Recording</> : <><Mic size={20} /> Start Recording</>}
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={submitting || isSpeaking}
                className="flex-1 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(124,58,237,0.2)] disabled:opacity-50"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Submit Answer
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Camera & Proctoring */}
        <div className="w-[320px] flex flex-col gap-6">
          <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl h-[240px] flex-shrink-0">
            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-all ${faceWarningVisible ? 'grayscale blur-[2px]' : ''}`} />
            
            {/* The tracking canvas overlay */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

            {/* Warning Overlay */}
            <AnimatePresence>
              {faceWarningVisible && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-red-900/40 flex flex-col items-center justify-center backdrop-blur-sm"
                >
                  <EyeOff size={40} className="text-red-400 mb-2 animate-bounce" />
                  <span className="font-bold text-white text-lg tracking-wide shadow-red-900 drop-shadow-md">VIEW CAMERA</span>
                  <span className="text-red-100 text-xs mt-1 font-medium bg-red-900/50 px-2 py-0.5 rounded">Face not detected</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Safe overlay indicator */}
            {!faceWarningVisible && faceDetected && (
              <div className="absolute top-3 left-3 bg-emerald-500/80 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                <Eye size={12} /> TRACKING
              </div>
            )}
          </div>

          <div className="flex-1 rounded-3xl bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
              <ShieldAlert size={16} className="text-violet-400" />
              <h3 className="font-bold text-sm tracking-wider uppercase">Proctoring System</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400">Environment</span>
                <span className="text-xs font-bold text-emerald-400">SECURE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400">Microphone</span>
                <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400">Focus Tracking</span>
                <span className={`text-xs font-bold ${faceWarningVisible ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                  {faceWarningVisible ? 'FACE GONE' : 'LOCKED'}
                </span>
              </div>
            </div>

            <p className="mt-8 text-[10px] text-neutral-500 leading-relaxed italic">
              Warning: Looking away, leaving the camera view, switching tabs, or exiting full screen will immediately flag your session for manual HR review.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
