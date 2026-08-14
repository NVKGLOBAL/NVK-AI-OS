
import React, { useState, useRef, useEffect } from 'react';
import type { PlaybackState, HistoricalEvent } from '../../types';
import PlaybackEventRibbon from './PlaybackEventRibbon'; // Import the new component

interface RitualPlaybackControlsProps {
  playbackState: PlaybackState;
  eventHistory: HistoricalEvent[]; // To determine timeline range
  setPlaybackState: React.Dispatch<React.SetStateAction<PlaybackState>>;
  onSeek?: (timestamp: number) => void; // Optional: Callback for when user manually seeks
}

const RIBBON_HEIGHT = 20; // Height for the entropy ribbon in pixels

const RitualPlaybackControls: React.FC<RitualPlaybackControlsProps> = ({
  playbackState,
  eventHistory,
  setPlaybackState,
  onSeek,
}) => {
  const [scrubberContainerWidth, setScrubberContainerWidth] = useState(0);
  const scrubberContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrubberContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setScrubberContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    // Set initial width
    setScrubberContainerWidth(container.offsetWidth);

    return () => resizeObserver.unobserve(container);
  }, []);


  const handlePlayPause = () => {
    setPlaybackState(prev => {
      const newIsActive = !prev.isActive;
      let newCurrentTime = prev.currentHistoricalTime;
      if (newIsActive && newCurrentTime === null && eventHistory.length > 0) {
        newCurrentTime = prev.timelineRange.start;
      } else if (!newIsActive && prev.currentHistoricalTime === prev.timelineRange.end && eventHistory.length > 0) {
        newCurrentTime = prev.timelineRange.start; // Reset to start if paused at end
      }
      return { ...prev, isActive: newIsActive, currentHistoricalTime: newCurrentTime };
    });
  };

  const handleScrubberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(event.target.value, 10);
    // Call setPlaybackState directly to update currentHistoricalTime and pause playback
    setPlaybackState(prev => ({ ...prev, currentHistoricalTime: newTime, isActive: false, lastSeekedTime: newTime }));
    if (onSeek) {
      onSeek(newTime); // Notify parent about the seek action
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackState(prev => ({ ...prev, playbackSpeed: newSpeed }));
  };
  
  const minTime = playbackState.timelineRange.start;
  const maxTime = playbackState.timelineRange.end > minTime ? playbackState.timelineRange.end : minTime + 1; // Ensure maxTime > minTime
  const currentTimeForScrubber = playbackState.currentHistoricalTime ?? minTime;

  return (
    <div className="ritual-playback-controls-panel bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 my-8 shadow-xl text-slate-300">
      <h3 className="text-lg font-['Cinzel'] font-semibold text-slate-200 mb-4 text-center">Ritual Playback Controls</h3>
      <div className="flex flex-col gap-2"> {/* Changed to flex-col for ribbon */}
        {/* Entropy Ribbon */}
        {eventHistory.length > 0 && scrubberContainerWidth > 0 && (
           <div ref={scrubberContainerRef} className="w-full h-[${RIBBON_HEIGHT}px] mb-1 bg-slate-800/50 rounded">
            <PlaybackEventRibbon
              playbackState={playbackState}
              eventHistory={eventHistory}
              canvasWidth={scrubberContainerWidth}
              canvasHeight={RIBBON_HEIGHT}
            />
          </div>
        )}
        
        {/* Original Controls Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className={`p-2 rounded-full transition-colors text-xl
                ${playbackState.isActive 
                  ? 'bg-rose-600/80 hover:bg-rose-500/80 text-white' 
                  : 'bg-emerald-600/80 hover:bg-emerald-500/80 text-white'
                }`}
              title={playbackState.isActive ? 'Pause Playback' : 'Play History'}
              aria-pressed={playbackState.isActive}
              disabled={eventHistory.length === 0}
            >
              {playbackState.isActive ? <i className="ri-pause-line"></i> : <i className="ri-play-line"></i>}
            </button>
            <div className="text-xs font-mono">
              {eventHistory.length === 0 ? "No History" : playbackState.isActive ? "Playing History" : "Playback Paused"}
            </div>
          </div>

          <div className={`flex-grow flex items-center gap-2 mx-4 ${eventHistory.length === 0 ? 'opacity-50' : ''}`}>
            <span className="text-xs font-mono w-20 text-right">
              {playbackState.currentHistoricalTime ? new Date(playbackState.currentHistoricalTime).toLocaleTimeString() : (eventHistory.length > 0 ? new Date(minTime).toLocaleTimeString() : '--:--:--')}
            </span>
            <input
              type="range"
              min={minTime}
              max={maxTime}
              value={currentTimeForScrubber}
              onChange={handleScrubberChange} // This now calls onSeek implicitly via setPlaybackState
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              disabled={eventHistory.length === 0}
              aria-label="Playback Timeline Scrubber"
            />
            <span className="text-xs font-mono w-20 text-left">
              {eventHistory.length > 0 ? new Date(maxTime).toLocaleTimeString() : '--:--:--'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs">Speed:</span>
            {[0.5, 1, 2].map(speed => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-0.5 rounded text-xs border
                  ${playbackState.playbackSpeed === speed 
                    ? 'bg-sky-500 border-sky-400 text-white' 
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                  }`}
                disabled={eventHistory.length === 0}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RitualPlaybackControls;