"use client";

import { CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function InterviewCompletedPage() {
  useEffect(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white relative overflow-hidden" style={{ background: '#0a0514' }}>
      
      {/* ── Background Mesh ── */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 15, repeat: Infinity }}
          className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[130px]" 
        />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgyMHYyMEgxeiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-40" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, type: "spring" }}
        className="relative z-10 text-center space-y-6 max-w-lg p-10 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] shadow-2xl mx-6"
      >
        <motion.div 
           initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
           className="w-24 h-24 mx-auto rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.2)] mb-8"
        >
          <ShieldCheck className="text-emerald-400" size={40} />
        </motion.div>

        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Telemetry Captured
        </h1>
        
        <p className="text-neutral-400 text-lg leading-relaxed font-medium">
          Your technical assessment and proctoring logs have been successfully secured and encrypted.
        </p>

        <div className="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-left shadow-inner">
          <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 mb-2">Protocol Status: Finalized</p>
          <p className="text-sm text-neutral-400 leading-relaxed font-medium">
            Strict AI evaluation is now processing your spoken responses against the required technical matrix. Wait for your administrator to reach out regarding the next steps.
          </p>
        </div>

        <Link href="/" className="inline-block pt-6">
          <motion.button 
            whileHover={{ x: 5 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full text-sm font-bold text-white transition-all bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20"
          >
            DISCONNECT SESSION
            <ArrowRight size={16} />
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
