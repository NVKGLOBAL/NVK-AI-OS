import React, { useState, useEffect, useRef } from 'react';

interface WorldClock {
  name: string;
  tz: string;
  icon: string;
  desc: string;
}

const CLOCK_THEMES = [
  { id: 'slate', name: 'Cosmic Slate', border: 'border-slate-800', text: 'text-sky-400', accent: 'text-sky-100', radialBg: 'rgba(56,189,248,0.05)' },
  { id: 'cyber', name: 'Neon Cyberpunk', border: 'border-fuchsia-900/40', text: 'text-fuchsia-400', accent: 'text-fuchsia-100', radialBg: 'rgba(232,121,249,0.05)' },
  { id: 'gold', name: 'Sacred Gold', border: 'border-amber-800/40', text: 'text-amber-400', accent: 'text-amber-500', radialBg: 'rgba(245,158,11,0.05)' }
];

const ClockTimerPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clocks' | 'stopwatch' | 'countdown' | 'pomodoro'>('clocks');
  const [time, setTime] = useState(new Date());
  
  // Customization Settings
  const [activeTheme, setActiveTheme] = useState('slate');
  
  // Stopwatch States
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isSwRunning, setIsSwRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  
  // Countdown States
  const [countdownDuration, setCountdownDuration] = useState(300); // 5 mins default
  const [countdownRemaining, setCountdownRemaining] = useState(300);
  const [isCdRunning, setIsCdRunning] = useState(false);
  const [cdInput, setCdInput] = useState('5');
  
  // Pomodoro States
  const [pomoTask, setPomoTask] = useState('Lattice OS Optimization');
  const [pomoCycleCount, setPomoCycleCount] = useState(0);
  const [pomoState, setPomoState] = useState<'idle' | 'focus' | 'break'>('idle');
  const [pomoTimeLeft, setPomoTimeLeft] = useState(1500); // 25 mins
  const [isPomoRunning, setIsPomoRunning] = useState(false);

  // General Clock Tick
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Stopwatch Tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSwRunning) {
      interval = setInterval(() => setStopwatchTime(t => t + 10), 10);
    }
    return () => clearInterval(interval);
  }, [isSwRunning]);

  // Countdown Tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCdRunning && countdownRemaining > 0) {
      interval = setInterval(() => {
        setCountdownRemaining(r => {
          if (r <= 1) {
            setIsCdRunning(false);
            triggerAlarm('Countdown timer completed!');
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCdRunning, countdownRemaining]);

  // Pomodoro Tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPomoRunning && pomoTimeLeft > 0) {
      interval = setInterval(() => {
        setPomoTimeLeft(l => {
          if (l <= 1) {
            if (pomoState === 'focus') {
              setPomoState('break');
              setPomoTimeLeft(300); // 5 min break
              setPomoCycleCount(c => c + 1);
              triggerAlarm('Focus cycle complete! Take a break.');
            } else {
              setPomoState('focus');
              setPomoTimeLeft(1500); // 25 min focus
              triggerAlarm('Break is over! Time to focus.');
            }
            return 0;
          }
          return l - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPomoRunning, pomoTimeLeft, pomoState]);

  const triggerAlarm = (message: string) => {
    // Elegant system visual alert
    console.log(`[CHRONOMETER LOG]: ${message}`);
    alert(`[NVK OS CHIME] 🔔\n\n${message}`);
  };

  const formatStopwatch = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const cent = Math.floor((ms % 1000) / 10);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${cent.toString().padStart(2, '0')}`;
  };

  const formatSeconds = (seconds: number) => {
    const min = Math.floor(seconds / 600);
    const m = Math.floor((seconds % 600) / 60);
    const s = seconds % 60;
    if (min > 0) {
      return `${min}h ${m}m ${s}s`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const worldClocks: WorldClock[] = [
    { name: 'UTC Coordinate', tz: 'UTC', icon: 'ri-global-line', desc: 'Universal Standard' },
    { name: 'Silicon Valley', tz: 'America/Los_Angeles', icon: 'ri-command-line', desc: 'Lattice Dev Node' },
    { name: 'London Station', tz: 'Europe/London', icon: 'ri-ancient-gate-line', desc: 'GMT Meridian' },
    { name: 'Neo-Tokyo', tz: 'Asia/Tokyo', icon: 'ri-robot-line', desc: 'AI Synthesis Hub' },
    { name: 'Giza Pyramids', tz: 'Africa/Cairo', icon: 'ri-compasses-fill', desc: 'Sacred Anchor Location' }
  ];

  const getTheme = () => CLOCK_THEMES.find(t => t.id === activeTheme) || CLOCK_THEMES[0];

  const handleStartPomo = () => {
    setPomoState('focus');
    setPomoTimeLeft(1500);
    setIsPomoRunning(true);
  };

  const handleSetCountdown = () => {
    const mins = parseFloat(cdInput);
    if (!isNaN(mins) && mins > 0) {
      const secs = Math.round(mins * 60);
      setCountdownDuration(secs);
      setCountdownRemaining(secs);
      setIsCdRunning(false);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 p-4 sm:p-5 flex flex-col font-mono relative overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle_at_center, ${getTheme().radialBg} 0, transparent 70%)` }} />
      
      {/* Top Tabs Customization bar */}
      <div className="flex flex-wrap justify-between items-center pb-3 border-b border-white/5 mb-4 sm:mb-5 z-10 gap-2">
        <div className="flex bg-slate-900/50 p-0.5 rounded-lg border border-slate-800">
          {(['clocks', 'stopwatch', 'countdown', 'pomodoro'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                activeTab === tab 
                  ? 'bg-slate-800 text-white shadow shadow-black' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Theme customization switches */}
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] uppercase tracking-widest text-slate-600 font-bold hidden xs:inline">FACE:</span>
          <div className="flex bg-slate-950 p-0.5 rounded border border-white/5">
            {CLOCK_THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => setActiveTheme(theme.id)}
                className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer border ${
                  theme.id === 'slate' ? 'bg-sky-500 border-sky-450' : theme.id === 'cyber' ? 'bg-fuchsia-500 border-fuchsia-450' : 'bg-amber-500 border-amber-450'
                } ${activeTheme === theme.id ? 'scale-110 ring-2 ring-white/20' : 'opacity-40 hover:opacity-85'}`}
                title={theme.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main tab content */}
      <div className="flex-grow flex flex-col justify-center items-center z-10 mb-2">
        
        {/* WORLD CLOCKS TAB */}
        {activeTab === 'clocks' && (
          <div className="w-full flex flex-col justify-between h-full gap-4 max-w-lg mx-auto">
            
            {/* Focal Big Clock Face */}
            <div className="text-center py-4 bg-slate-900/10 border border-white/5 rounded-2xl p-4 relative overflow-hidden backdrop-blur">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">LATTICE MASTER CHRONO</div>
              <div className={`text-4xl xs:text-5xl font-light tracking-tight ${getTheme().accent}`}>
                {time.toLocaleTimeString([], { hour12: false })}
              </div>
              <div className="text-[9px] text-slate-500 mt-2 tracking-widest uppercase">
                {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* Sub World Grid */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              {worldClocks.map((clock, idx) => {
                const subTimeStr = time.toLocaleTimeString([], { 
                  timeZone: clock.tz, 
                  hour12: false, 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                return (
                  <div key={idx} className="bg-slate-900/30 p-2.5 rounded-lg border border-white/5 hover:border-slate-850 transition-all flex flex-col">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <i className={`${clock.icon} text-slate-400 text-xs`}></i>
                      <span className="text-[8.5px] uppercase tracking-wider font-semibold truncate">{clock.name}</span>
                    </div>
                    <div className="text-lg font-medium text-slate-200 font-mono mt-1">
                      {subTimeStr}
                    </div>
                    <span className="text-[7.5px] text-slate-600 truncate mt-0.5">{clock.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STOPWATCH TAB */}
        {activeTab === 'stopwatch' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-5">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">HIGH-PRECISION CHRONOMETER</h3>
            
            <div className="text-4xl sm:text-5xl tracking-widest text-white py-4 font-semibold px-6 bg-slate-900/40 border border-white/5 rounded-2xl w-full text-center tabular-nums">
              {formatStopwatch(stopwatchTime)}
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center w-full">
              <button 
                onClick={() => setIsSwRunning(!isSwRunning)}
                className={`py-1.5 px-5 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  isSwRunning 
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 hover:bg-rose-500/25' 
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25'
                }`}
              >
                {isSwRunning ? 'STOP' : 'START'}
              </button>

              <button 
                onClick={() => {
                  if (isSwRunning) {
                    setLaps([stopwatchTime, ...laps]);
                  }
                }}
                disabled={!isSwRunning}
                className="py-1.5 px-5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-slate-800/60 border border-white/5 text-slate-400 hover:text-white disabled:opacity-25 transition-all cursor-pointer"
              >
                LAP
              </button>

              <button 
                onClick={() => { setIsSwRunning(false); setStopwatchTime(0); setLaps([]); }}
                className="py-1.5 px-5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-slate-800/80 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                RESET
              </button>
            </div>

            {/* Laps List */}
            {laps.length > 0 && (
              <div className="w-full max-h-24 overflow-y-auto border border-white/5 rounded-lg p-2 bg-slate-900/20 custom-scrollbar mt-1">
                <div className="flex justify-between text-[7.5px] font-mono text-slate-600 uppercase border-b border-white/5 pb-1 mb-1.5 font-bold">
                  <span>LAP NUMBER</span>
                  <span>LAP DURATION</span>
                </div>
                {laps.map((lap, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] py-0.5 border-b border-white/5 last:border-0 font-mono text-slate-400">
                    <span className="text-slate-600">LAP {laps.length - idx}</span>
                    <span className="font-semibold text-slate-300">{formatStopwatch(lap)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COUNTDOWN TIMER TAB */}
        {activeTab === 'countdown' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">QUANTUM COUNTDOWN</h3>
            
            <div className="text-4xl sm:text-5xl text-cyan-400 py-3 font-semibold w-full text-center tabular-nums">
              {formatSeconds(countdownRemaining)}
            </div>

            {/* Progress Visualizer Bar */}
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-400 transition-all duration-1000" 
                style={{ width: `${(countdownRemaining / Math.max(1, countdownDuration)) * 100}%` }}
              />
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1.5 flex-wrap justify-center my-1 select-none">
              {[1, 5, 10, 15, 30].map(mins => (
                <button
                  key={mins}
                  onClick={() => {
                    setCdInput(mins.toString());
                    setCountdownDuration(mins * 60);
                    setCountdownRemaining(mins * 60);
                    setIsCdRunning(false);
                  }}
                  className={`py-0.5 px-2 text-[8px] font-bold rounded border transition-all cursor-pointer ${
                    cdInput === mins.toString() 
                      ? 'bg-cyan-500/15 border-cyan-500/45 text-cyan-300' 
                      : 'bg-slate-900/50 border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {mins}M
                </button>
              ))}
            </div>

            {/* Custom Input controls */}
            <div className="flex gap-2 items-center w-full bg-slate-900/40 p-2 rounded-lg border border-white/5">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Min:</span>
              <input
                type="number"
                min="0.1"
                max="120"
                step="0.5"
                value={cdInput}
                onChange={(e) => setCdInput(e.target.value)}
                className="bg-transparent text-xs w-16 text-center text-white border-b border-white/10 outline-none p-0.5"
              />
              <button 
                onClick={handleSetCountdown}
                className="py-1 px-3 bg-slate-800 hover:bg-slate-700 border border-white/5 text-[9px] font-bold rounded cursor-pointer"
              >
                APPLY
              </button>
            </div>

            {/* Control Run */}
            <div className="flex gap-3 justify-center mt-2">
              <button 
                onClick={() => setIsCdRunning(!isCdRunning)}
                className={`py-1.5 px-6 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  isCdRunning 
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 hover:bg-rose-500/25' 
                    : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/25'
                }`}
              >
                {isCdRunning ? 'PAUSE' : 'START'}
              </button>
              <button 
                onClick={() => { setIsCdRunning(false); setCountdownRemaining(countdownDuration); }}
                className="py-1.5 px-5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-slate-800/50 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                RESET
              </button>
            </div>
          </div>
        )}

        {/* POMODORO TASK FOCUS TAB */}
        {activeTab === 'pomodoro' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">INTELLIGENT POMODORO ENERGISED STUDY</h3>
            
            <div className="text-center">
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider border ${
                pomoState === 'focus' ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30' : pomoState === 'break' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-white/5'
              }`}>
                {pomoState === 'focus' ? 'FOCUS SESSION' : pomoState === 'break' ? 'AMU BREATHING CYCLE' : 'STANDBY'}
              </span>
            </div>

            <div className="text-4xl text-fuchsia-300 py-2 font-semibold">
              {formatSeconds(pomoTimeLeft)}
            </div>

            {/* Task input */}
            <div className="w-full flex flex-col gap-1.5 bg-slate-900/30 p-2.5 border border-white/5 rounded-lg text-left">
              <span className="text-[8px] font-bold text-slate-500 uppercase">Current Ritual Focus:</span>
              <input
                type="text"
                value={pomoTask}
                onChange={(e) => setPomoTask(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-white outline-none w-full p-0"
                placeholder="Name your focus task..."
              />
            </div>

            {/* Stats */}
            <div className="flex justify-between w-full text-[9px] font-mono text-slate-500 bg-slate-950/40 px-3 py-1.5 rounded border border-white/5">
              <span>CYCLES COMPLETED:</span>
              <span className="text-fuchsia-400 font-bold">{pomoCycleCount}</span>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {!isPomoRunning && pomoState === 'idle' ? (
                <button
                  onClick={handleStartPomo}
                  className="py-1.5 px-6 rounded-full text-[10px] bg-fuchsia-500/15 border border-fuchsia-550/30 text-fuchsia-300 hover:bg-fuchsia-500/25 transition-all text-center uppercase tracking-widest font-bold cursor-pointer"
                >
                  Activate Focus Mode
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsPomoRunning(!isPomoRunning)}
                    className={`py-1.5 px-4 rounded-full text-[10px] uppercase font-bold tracking-wider cursor-pointer ${
                      isPomoRunning ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isPomoRunning ? 'PAUSE' : 'RESUME'}
                  </button>
                  <button
                    onClick={() => {
                      setIsPomoRunning(false);
                      setPomoState('idle');
                      setPomoTimeLeft(1500);
                    }}
                    className="py-1.5 px-4 rounded-full bg-slate-800 text-[10px] text-slate-400 border border-white/5 uppercase font-bold tracking-wider hover:text-white cursor-pointer"
                  >
                    STOP
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Diagnostics details footer */}
      <div className="p-1.5 border-t border-white/5 bg-slate-900/30 text-[7.5px] text-slate-600 flex justify-between uppercase mt-2">
        <span>TIMER CORE: ACTIVE</span>
        <span>THEME_{getTheme().name.replace(' ', '_').toUpperCase()}</span>
      </div>
    </div>
  );
};

export default ClockTimerPanel;
