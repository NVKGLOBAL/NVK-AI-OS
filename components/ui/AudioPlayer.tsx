
import React, { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  url?: string;
  isPlaying?: boolean; // Optional prop to control playback externally
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, isPlaying = false }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (url) {
        if (audioRef.current.src !== url) {
            audioRef.current.src = url;
        }
        if (isPlaying) {
            audioRef.current.play().catch(e => console.warn('Audio play blocked or error:', e));
        } else {
            audioRef.current.pause();
            // audioRef.current.currentTime = 0; // Optional: reset audio on pause
        }
      } else {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    }
  }, [url, isPlaying]);

  // This component doesn't render any visible UI itself
  return <audio ref={audioRef} hidden />;
};
