
import React, { useEffect, useRef, useMemo } from 'react';
import type { PlaybackState, HistoricalEvent, HistoricalEntropyUpdateEventData } from '../../types';
import { HistoricalEventType } from '../../types';

interface PlaybackEventRibbonProps {
  playbackState: PlaybackState;
  eventHistory: HistoricalEvent[];
  canvasWidth: number;
  canvasHeight: number;
}

const getEntropyColor = (entropy: number): string => {
  if (entropy < 0.15) return '#67e8f9'; // cyan-300 (calm)
  if (entropy < 0.3) return '#38bdf8';  // sky-400
  if (entropy < 0.45) return '#818cf8'; // indigo-400
  if (entropy < 0.6) return '#a78bfa';  // violet-400
  if (entropy < 0.75) return '#f472b6'; // pink-400
  return '#ef4444'; // red-500 (volatile)
};

const MAX_ENTROPY_DISPLAY = 1.0; // Assume entropy values are generally between 0 and 1

const PlaybackEventRibbon: React.FC<PlaybackEventRibbonProps> = ({
  playbackState,
  eventHistory,
  canvasWidth,
  canvasHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const entropyDataPoints = useMemo(() => {
    return eventHistory
      .filter((event): event is HistoricalEvent & { type: HistoricalEventType.ENTROPY_UPDATED, data: HistoricalEntropyUpdateEventData } => event.type === HistoricalEventType.ENTROPY_UPDATED)
      .map(event => ({
        timestamp: event.timestamp,
        entropy: event.data.newEntropy,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [eventHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth <= 0 || canvasHeight <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const { timelineRange, currentHistoricalTime } = playbackState;
    const minTime = timelineRange.start;
    const maxTime = timelineRange.end;
    const timeSpan = maxTime - minTime;

    // Draw current time marker first (so it's potentially behind the graph)
    if (currentHistoricalTime !== null) {
      let markerX;
      if (timeSpan <= 0) { // Handle single point in time or empty history for marker
        markerX = canvasWidth / 2; // Default to center if no span
      } else {
        markerX = ((currentHistoricalTime - minTime) / timeSpan) * canvasWidth;
      }
      ctx.beginPath();
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, canvasHeight);
      ctx.strokeStyle = '#fde047'; // yellow-300
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    if (timeSpan <= 0 || entropyDataPoints.length === 0) {
        return; // Don't draw graph if no timespan or no data points
    }


    // Draw the entropy line graph
    ctx.beginPath();
    let firstPoint = true;
    entropyDataPoints.forEach((point, index) => {
      const x = ((point.timestamp - minTime) / timeSpan) * canvasWidth;
      const y = canvasHeight - (Math.min(point.entropy, MAX_ENTROPY_DISPLAY) / MAX_ENTROPY_DISPLAY) * canvasHeight;
      
      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
      // Change stroke color based on entropy for the next segment
      if (index < entropyDataPoints.length -1) {
        const nextPoint = entropyDataPoints[index+1];
        const nextX = ((nextPoint.timestamp - minTime) / timeSpan) * canvasWidth;
        const nextY = canvasHeight - (Math.min(nextPoint.entropy, MAX_ENTROPY_DISPLAY) / MAX_ENTROPY_DISPLAY) * canvasHeight;
        
        ctx.strokeStyle = getEntropyColor(point.entropy);
        ctx.lineWidth = 2;
        ctx.stroke(); // Stroke current segment
        ctx.beginPath(); // Start new path for next segment
        ctx.moveTo(x,y); // Move to current point
        ctx.lineTo(nextX, nextY); // Line to next point (will be stroked in next iteration or after loop)

      } else { // last segment
        ctx.strokeStyle = getEntropyColor(point.entropy);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    

  }, [entropyDataPoints, playbackState, canvasWidth, canvasHeight]);

  if (canvasWidth <= 0 || canvasHeight <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="block" // To ensure it takes up layout space correctly
      aria-label="Entropy timeline visualization"
    />
  );
};

export default PlaybackEventRibbon;
