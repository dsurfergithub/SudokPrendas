import { useEffect, useRef, useState } from 'react';
import { Mic, X, AlertCircle, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export default function CameraCapture({ onComplete, onCancel }: { onComplete: (blobs: Blob[]) => void, onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [captures, setCaptures] = useState<Blob[]>([]);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (captures.length > 0) {
      const url = URL.createObjectURL(captures[captures.length - 1]);
      setLastCaptureUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [captures]);

  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported');
    }
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('No se pudo acceder a la cámara. Revisa los permisos.');
      }
    }
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
         audioCtxRef.current.close();
      }
    };
  }, []);

  const playBeep = () => {
    try {
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const oscillator = audioCtxRef.current.createOscillator();
      const gainNode = audioCtxRef.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioCtxRef.current.currentTime + 0.1);
    } catch (e) {
      console.log('Audio feedback failed', e);
    }
  };

  const triggerCapture = () => {
    const overlay = document.getElementById('flash-overlay');
    if (overlay) {
      overlay.style.opacity = '1';
      setTimeout(() => overlay.style.opacity = '0', 75);
    }
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          setCaptures(prev => [...prev, blob]);
          playBeep();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Reconocimiento de voz no soportado (usa Chrome o Safari). Toca el botón para capturar.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-ES';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
        setIsListening(false);
        if (recognitionRef.current) {
           try { recognition.start(); } catch(e) {}
        }
    };
    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript.toLowerCase().trim();
      if (text.includes('foto') || text.includes('captura') || text.includes('ya')) {
        triggerCapture();
      }
    };
    recognition.onerror = (e: any) => {
        console.warn('Speech recognition error', e.error);
        if (e.error === 'not-allowed') {
           recognitionRef.current = null; // Stop trying to restart if denied
        }
    };

    try {
        recognition.start();
    } catch(e) {}

    return () => {
      recognitionRef.current = null;
      try { recognition.stop(); } catch(e) {}
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try { recognitionRef.current.stop(); } catch(e) {}
    } else {
      try { recognitionRef.current.start(); } catch(e) {
        console.error("Could not start recognition", e);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-200">
      <header className="p-4 flex justify-between items-center text-white shrink-0 z-10">
        <button type="button" onClick={onCancel} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
        <button 
          type="button"
          onClick={toggleListening}
          className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border active:scale-95", 
          isListening ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/10 text-white/50 border-white/10 hover:bg-white/20"
        )}>
          <Mic className="w-4 h-4" />
          {isListening ? 'Di "Foto"' : 'Tocar para voz'}
        </button>
        <button 
          type="button" 
          onClick={() => onComplete(captures)}
          className={cn(
            "px-4 py-2 rounded-full font-medium text-sm transition-all",
            captures.length > 0 ? "bg-white text-black" : "bg-white/10 text-white/50 opacity-0 pointer-events-none"
          )}
        >
          Listo ({captures.length})
        </button>
      </header>
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-900">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {error && (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80 z-20">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-white text-sm">{error}</p>
           </div>
        )}
        <div id="flash-overlay" className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-75"></div>
      </div>
      <div className="p-8 pb-safe flex justify-between items-center shrink-0 z-10 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 inset-x-0">
        <div className="w-16 flex justify-start">
          {captures.length > 0 && lastCaptureUrl && (
            <div className="relative">
              <div className="w-12 h-12 rounded-xl border-2 border-white/50 overflow-hidden">
                 <img src={lastCaptureUrl} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                {captures.length}
              </div>
            </div>
          )}
        </div>
        <button 
          type="button" 
          onClick={triggerCapture} 
          className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center backdrop-blur-sm active:bg-white/40 transition-colors relative z-10"
        >
           <div className="w-12 h-12 bg-white rounded-full shadow-sm"></div>
        </button>
        <div className="w-16 flex justify-end">
           {captures.length > 0 && (
             <button type="button" onClick={() => onComplete(captures)} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center relative z-10">
                <Check className="w-6 h-6" />
             </button>
           )}
        </div>
      </div>
    </div>
  );
}
