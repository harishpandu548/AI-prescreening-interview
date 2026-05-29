"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Camera, Mic, Monitor, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from '@/components/ui/use-toast';

export default function SystemCheckPage() {
  const { token } = useParams();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [checks, setChecks] = useState({
    camera: false,
    mic: false,
    fullscreen: false,
  });
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setChecks(prev => ({ ...prev, fullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const requestPermissions = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setChecks(prev => ({ ...prev, camera: true, mic: true }));
    } catch (error) {
      toast({ title: "Permission Denied", description: "Camera and Microphone are required for the interview.", variant: "destructive" });
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

  const allPassed = checks.camera && checks.mic && checks.fullscreen;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldCheck className="text-blue-500" size={32} />
              System Check
            </h1>
            <p className="text-neutral-400">
              Ensure your hardware is working correctly before starting the AI session.
            </p>
          </div>

          <div className="space-y-4">
            <CheckItem 
              icon={Camera} 
              label="Camera Preview" 
              status={checks.camera} 
              onAction={requestPermissions}
              actionLabel="Enable Camera"
            />
            <CheckItem 
              icon={Mic} 
              label="Microphone Audio" 
              status={checks.mic} 
              onAction={requestPermissions}
              actionLabel="Enable Mic"
            />
            <CheckItem 
              icon={Monitor} 
              label="Fullscreen Mode" 
              status={checks.fullscreen} 
              onAction={toggleFullscreen}
              actionLabel="Enter Fullscreen"
            />
          </div>

          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertCircle size={18} />
              <span className="text-sm font-semibold">Important Guidelines</span>
            </div>
            <ul className="text-xs text-neutral-500 list-disc list-inside space-y-1">
              <li>Do not exit fullscreen during the session.</li>
              <li>Do not switch tabs or open other applications.</li>
              <li>Stay in a well-lit, quiet environment.</li>
              <li>Once started, you cannot pause the interview.</li>
            </ul>
          </div>

          <Button 
            className={`w-full h-12 text-lg font-bold transition-all ${
              allPassed ? 'bg-green-600 hover:bg-green-700 shadow-[0_0_20px_rgba(22,163,74,0.3)]' : 'bg-neutral-800'
            }`}
            disabled={!allPassed}
            onClick={startInterview}
          >
            Start Interview Session
          </Button>
        </div>

        <div className="relative aspect-video rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-2xl">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover mirror"
          />
          {!checks.camera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 text-neutral-500">
              <Camera size={48} className="mb-2 opacity-20" />
              <span className="text-sm font-medium">Camera Feed Required</span>
            </div>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            {checks.camera && <Badge className="bg-green-500/20 text-green-500 border-green-500/30 backdrop-blur-md">Camera Active</Badge>}
            {checks.mic && <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 backdrop-blur-md">Audio Ready</Badge>}
          </div>
          {checks.fullscreen && (
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-blue-600/20 text-blue-400 border-pblue-500/30 backdrop-blur-md flex gap-2 items-center">
                <ShieldCheck size={14} />
                Secure Mode Active
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckItem({ icon: Icon, label, status, onAction, actionLabel }: any) {
  return (
    <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status ? 'bg-green-500/10 text-green-500' : 'bg-neutral-800 text-neutral-500'}`}>
            <Icon size={20} />
          </div>
          <span className={`font-medium ${status ? 'text-white' : 'text-neutral-400'}`}>{label}</span>
        </div>
        {status ? (
          <CheckCircle2 className="text-green-500" size={24} />
        ) : (
          <Button variant="ghost" size="sm" onClick={onAction} className="text-blue-400 hover:text-blue-300 hover:bg-neutral-800">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
