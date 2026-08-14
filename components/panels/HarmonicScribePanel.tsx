import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { HarmonicScribePanelProps, Axiom } from '../../types';
import { AgentName } from '../../types';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

import { useEcho } from '../../context/EchoContext';
// Helper function to create a simple hash from a string
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Simple music theory helper
const getScale = (layer: Axiom['layer']): number[] => {
    // Frequencies for a C major scale starting at C3
    const scales: Record<string, number[]> = {
        'I': [130.81, 146.83, 164.81, 174.61, 196.00], // C Pentatonic Major
        'II': [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94], // C Mixolydian
        'III': [130.81, 138.59, 164.81, 174.61, 196.00, 207.65, 246.94], // C Dorian
        'IV': [130.81, 138.59, 155.56, 174.61, 185.00, 207.65, 233.08], // C Phrygian Dominant
        'V': [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63], // C Major + high C
        'Ω': [130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 246.94], // C Chromatic
        'P': [130.81, 164.81, 196.00, 261.63, 329.63] // Open, peaceful intervals (C, E, G, C, E)
    };
    return scales[layer] || scales['I'];
};

const HarmonicScribePanel: React.FC<HarmonicScribePanelProps> = ({  axioms }) => {
  const { addEchoMessage } = useEcho();
  const [selectedAxiomId, setSelectedAxiomId] = useState<string>(axioms[0]?.id || '');
  const [intention, setIntention] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scheduledNotesRef = useRef<Array<OscillatorNode | GainNode>>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserNodeRef.current = audioContextRef.current.createAnalyser();
        analyserNodeRef.current.fftSize = 256;
    }
    return () => {
        audioContextRef.current?.close();
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const drawOscilloscope = useCallback(() => {
    if (!analyserNodeRef.current || !canvasRef.current || !isPlaying) {
      if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserNodeRef.current;
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgb(56, 189, 248)';
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for(let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if(i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  }, [isPlaying]);

  const handleTranscribe = () => {
    if (!audioContextRef.current || !selectedAxiomId) return;
    
    const selectedAxiom = axioms.find(a => a.id === selectedAxiomId);
    if (!selectedAxiom) return;

    setIsGenerating(true);
    addEchoMessage(AgentName.HarmonicCoreAgent, `Transcribing harmony from Axiom "${selectedAxiom.title}" with intention "${intention || 'pure resonance'}"...`, 'text-cyan-300');

    // --- Sequence Generation ---
    const seed = hashString(intention || selectedAxiom.title);
    const scale = getScale(selectedAxiom.layer);
    const bpm = selectedAxiom.resonanceFrequency * 1.5; // Map Hz to BPM
    const noteDuration = 60 / bpm; // Duration of a quarter note

    const sequenceLength = 16 + (seed % 16);
    const notes = [];
    for (let i = 0; i < sequenceLength; i++) {
        const noteIndex = (seed + i * 5 + Math.floor(i / 4)) % scale.length;
        const octave = Math.floor((seed + i*2) / scale.length) % 2; // Bass or melody
        notes.push({
            freq: scale[noteIndex] * (octave === 0 ? 0.5 : 1), // Bass notes one octave lower
            time: i * noteDuration,
            duration: noteDuration * (0.5 + ((seed+i*3)%5)/10), // vary note length
            isPad: i % 4 === 0,
        });
    }

    // --- Audio Playback ---
    if(isPlaying) stopPlayback();

    const masterGain = audioContextRef.current.createGain();
    masterGain.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    if (analyserNodeRef.current) masterGain.connect(analyserNodeRef.current);
    analyserNodeRef.current?.connect(audioContextRef.current.destination);

    scheduledNotesRef.current.push(masterGain);

    notes.forEach(note => {
        const osc = audioContextRef.current!.createOscillator();
        const gainNode = audioContextRef.current!.createGain();
        osc.connect(gainNode);
        gainNode.connect(masterGain);
        
        osc.frequency.setValueAtTime(note.freq, audioContextRef.current!.currentTime + note.time);
        osc.type = note.isPad ? 'sawtooth' : 'sine';
        
        const attackTime = 0.01;
        const decayTime = note.isPad ? 0.4 : 0.1;
        const sustainLevel = note.isPad ? 0.3 : 0.1;
        
        gainNode.gain.setValueAtTime(0, audioContextRef.current!.currentTime + note.time);
        gainNode.gain.linearRampToValueAtTime(note.isPad ? 0.25 : 0.5, audioContextRef.current!.currentTime + note.time + attackTime);
        gainNode.gain.exponentialRampToValueAtTime(sustainLevel, audioContextRef.current!.currentTime + note.time + attackTime + decayTime);
        gainNode.gain.setValueAtTime(sustainLevel, audioContextRef.current!.currentTime + note.time + note.duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0.0001, audioContextRef.current!.currentTime + note.time + note.duration);

        osc.start(audioContextRef.current!.currentTime + note.time);
        osc.stop(audioContextRef.current!.currentTime + note.time + note.duration + 0.5); // Add a tail for release
        
        scheduledNotesRef.current.push(osc, gainNode);
    });

    setIsGenerating(false);
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    scheduledNotesRef.current.forEach(node => {
      if (node instanceof OscillatorNode) node.stop();
      node.disconnect();
    });
    scheduledNotesRef.current = [];
    setIsPlaying(false);
    if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  useEffect(() => {
    if (isPlaying) {
        drawOscilloscope();
    } else {
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isPlaying, drawOscilloscope]);

  return (
    <div className="harmonic-scribe-panel bg-slate-900/90 backdrop-blur-md border border-cyan-600/50 rounded-xl shadow-2xl p-6 text-slate-100 my-6">
      <h3 className="text-2xl font-cinzel font-bold text-cyan-300 mb-4 text-center tracking-wider">
        <i className="ri-music-2-line mr-2"></i>Harmonic Scribe
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="controls-section space-y-4">
          <div>
            <label htmlFor="axiom-select" className="block text-sm font-medium text-cyan-400 mb-1 font-cormorant">
              Select Axiomatic Seed
            </label>
            <select
              id="axiom-select"
              value={selectedAxiomId}
              onChange={(e) => setSelectedAxiomId(e.target.value)}
              className="w-full p-2 rounded bg-slate-800 border-slate-700 text-slate-200 text-xs focus:ring-cyan-500 focus:border-cyan-500 custom-scrollbar"
              disabled={isGenerating || isPlaying}
            >
              {axioms.map(axiom => (
                <option key={axiom.id} value={axiom.id}>
                  {axiom.layer}:{axiom.series} - {axiom.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="intention-input" className="block text-sm font-medium text-cyan-400 mb-1 font-cormorant">
              State Intention (Seed)
            </label>
            <Textarea
              id="intention-input"
              placeholder="e.g., 'A melody of forgetting and return...'"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              className="h-24 text-xs bg-slate-700 border-slate-600"
              disabled={isGenerating || isPlaying}
            />
          </div>
          <div className="flex flex-col space-y-2">
             <Button
                onClick={handleTranscribe}
                disabled={isGenerating || isPlaying}
                className="bg-cyan-600 hover:bg-cyan-500 text-sm"
              >
                <i className="ri-quill-pen-line mr-2"></i>Transcribe Harmony
              </Button>
              <Button
                onClick={stopPlayback}
                disabled={!isPlaying}
                className="bg-rose-700 hover:bg-rose-600 text-sm"
              >
                <i className="ri-stop-fill mr-2"></i>Stop Playback
              </Button>
          </div>
        </div>

        {/* Visualization */}
        <div className="visualization-section flex flex-col items-center">
            <h4 className="text-sm font-cormorant text-cyan-400 mb-2">Resonance Oscilloscope</h4>
            <div className="w-full h-40 bg-black/50 border border-cyan-700/50 rounded-lg p-1">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>
            <div className="text-xs text-slate-400 mt-2">
                Status: {isGenerating ? 'Generating...' : isPlaying ? 'Playing Harmony...' : 'Idle'}
            </div>
        </div>
      </div>
    </div>
  );
};

export default HarmonicScribePanel;