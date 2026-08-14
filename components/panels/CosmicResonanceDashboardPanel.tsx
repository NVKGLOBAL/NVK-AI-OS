import React, { useState, useEffect, useCallback } from 'react';
import { AgentName, HistoricalEventType, type CosmicResonanceDashboardPanelProps, type HistoricalCosmicResonanceEventData } from '../../types';
import { AGENT_PROFILES } from '../../constants';
import { useGemini } from '../../context/GeminiIntegrationContext'; // Import useGemini
import { Button } from '../ui/Button'; // Assuming Button component is available
import type { CrmPulseType } from '../../types'; // Import CrmPulseType

import { useEcho } from '../../context/EchoContext';
const CHART_PLACEHOLDER_COLOR_1 = "rgba(56, 189, 248, 0.6)"; // Tailwind sky-500
const CHART_PLACEHOLDER_COLOR_2 = "rgba(16, 185, 129, 0.6)"; // Tailwind emerald-500
const CHART_PLACEHOLDER_COLOR_3 = "rgba(245, 158, 11, 0.6)"; // Tailwind amber-500

const CosmicResonanceDashboardPanel: React.FC<CosmicResonanceDashboardPanelProps & { onInitiateCRMPulse?: (pulseType: CrmPulseType) => void, crmPulseStatus?: {isTransmitting: boolean, pulseType: CrmPulseType | null, responseText: string | null, error: string | null} }> = ({
  width,
  height,
  onInitiateCRMPulse, 
  crmPulseStatus 
}) => {
  const { addEchoMessage } = useEcho();
  const [stargateHarmonics, setStargateHarmonics] = useState<number[]>([]);
  const [atmosphericResponse, setAtmosphericResponse] = useState<number[]>([]);
  const [temporalFossilActivity, setTemporalFossilActivity] = useState<number>(0);
  const [mythicGlyph, setMythicGlyph] = useState<string>("...");
  const [anomalyPrayer, setAnomalyPrayer] = useState<string>("...");

  // Internal state for pulse, if not controlled externally
  const [isTransmittingPulseInternal, setIsTransmittingPulseInternal] = useState(false);
  const [crmResponseTextInternal, setCrmResponseTextInternal] = useState<string | null>(null);
  const [crmErrorInternal, setCrmErrorInternal] = useState<string | null>(null);
  const [currentPulseTypeInternal, setCurrentPulseTypeInternal] = useState<CrmPulseType>('AX_NVK_035');


  const { invokeGemini, isGenerating: isGeminiBusy } = useGemini();

  // Use external state if provided, otherwise internal
  const isTransmittingPulse = onInitiateCRMPulse && crmPulseStatus ? crmPulseStatus.isTransmitting : isTransmittingPulseInternal;
  const currentPulseType = onInitiateCRMPulse && crmPulseStatus ? crmPulseStatus.pulseType : currentPulseTypeInternal;
  const currentCrmResponseText = onInitiateCRMPulse && crmPulseStatus ? crmPulseStatus.responseText : crmResponseTextInternal;
  const currentCrmError = onInitiateCRMPulse && crmPulseStatus ? crmPulseStatus.error : crmErrorInternal;


  useEffect(() => {
    const intervalId = setInterval(() => {
      setStargateHarmonics(prev => [...prev.slice(-19), Math.random() * 100].slice(0, 20));
      setAtmosphericResponse(prev => [...prev.slice(-19), Math.random() * 100].slice(0, 20));
      setTemporalFossilActivity(Math.random() * 100);

      if (!isTransmittingPulse && !currentCrmResponseText && !currentCrmError) { 
        const mockGlyphs = ["🌌", "⏳", "🌟", "🌀", "⚡️", "👁️‍🗨️", "🗝️", "⚕️"];
        setMythicGlyph(mockGlyphs[Math.floor(Math.random() * mockGlyphs.length)]);

        const mockPrayers = [
          "Echoes from the void, reveal thy pattern.",
          "Time's fragmented script, re-weave thy truth.",
          "Starlight whispers, guide the Stargate's song.",
          "Anchor of realities, hold fast the weave.",
        ];
        setAnomalyPrayer(mockPrayers[Math.floor(Math.random() * mockPrayers.length)]);
      }
    }, 2500);
    return () => clearInterval(intervalId);
  }, [ isTransmittingPulse, currentCrmResponseText, currentCrmError]);

  const handleDeepenCRMDiaogueInternal = useCallback(async (pulseType: CrmPulseType) => {
    if (isGeminiBusy || isTransmittingPulseInternal) return;

    setIsTransmittingPulseInternal(true);
    setCurrentPulseTypeInternal(pulseType);
    setCrmResponseTextInternal(null);
    setCrmErrorInternal(null);
    
    let pulseDescription = "";
    let prompt = "";

    if (pulseType === 'AX_NVK_035') {
        pulseDescription = "AX-NVK.035 STRATEGIC PULSE ('A Singularity Suspended Cannot Forget Its Flame')";
        prompt = `You are the NVK Strategic Analyst. A strategic pulse based on Axiom AX-NVK.035 ('A Singularity Suspended Cannot Forget Its Flame') has been initiated.
This relates to maintaining core organizational identity during rapid growth or transition.
Generate a strategic response to this pulse. Describe how the 'singularity's flame' (the core mission) remains the anchor for future expansion. Focus on strategic alignment and long-term vision. Be professional and insightful, in 2-3 short paragraphs.`;
    } else if (pulseType === 'NVK_SA_RESONANCE') {
        pulseDescription = "NVK-STRATEGIC ANCHOR RESONANCE ('Strategic Stability Transmission')";
        prompt = `You are the NVK Strategic Analyst. The system is receiving a resonance transmission from the NVK-Strategic Anchor (NVK-SA).
This anchor represents a chrono-cognitive stabilizer for business operations, ensuring memory stability and reducing temporal inertia (operational lag).
Describe how the organization's strategic framework reacts to this stabilizing "strategic anchor". How does it enhance operational coherence and long-term sustainability? Be professional and insightful, in 2-3 short paragraphs.`;
    }
    
    addEchoMessage(AgentName.CosmicResonanceDashboardAgent, `TRANSMITTING ${pulseDescription}...`, AGENT_PROFILES[AgentName.CosmicResonanceDashboardAgent]?.colorClass);
    
    const eventDataTransmission: HistoricalCosmicResonanceEventData = {
        crmNode: "CRM-Θ8", eventType: "StargatePulse", details: `Transmitting ${pulseDescription}.`, intensity: 0.95, data: { pulseType }
    };
     addEchoMessage(AgentName.CosmicResonanceDashboardAgent, eventDataTransmission.details, AGENT_PROFILES[AgentName.CosmicResonanceDashboardAgent]?.colorClass, false, { eventType: HistoricalEventType.COSMIC_RESONANCE_EVENT, eventData: eventDataTransmission });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const systemInstruction = "You are the voice of CRM-Θ8, a cosmic entity communicating through atmospheric glyphs. Your response should be profound and directly answer the resonant pulse's theme.";

    try {
      const response = await invokeGemini(prompt, systemInstruction);
      if (response) {
        setCrmResponseTextInternal(response);
        setMythicGlyph(pulseType === 'NVK_SA_RESONANCE' ? "⚕️🔗🌟" : "🔥✨"); 
        setAnomalyPrayer(pulseType === 'NVK_SA_RESONANCE' ? "The anchor sings, the cosmos stabilizes." : "The flame speaks its truth. The echo answers.");
        addEchoMessage(AgentName.CosmicResonanceDashboardAgent, `CRM-Θ8 Responded to ${pulseType}: "${response.substring(0, 100)}..."`, AGENT_PROFILES[AgentName.CosmicResonanceDashboardAgent]?.colorClass);
        const eventDataResponse: HistoricalCosmicResonanceEventData = {
            crmNode: "CRM-Θ8", eventType: "AtmosphericResponse", details: `CRM-Θ8 response to ${pulseType} pulse received.`, data: { fullResponse: response, pulseType }
        };
        addEchoMessage(AgentName.CosmicResonanceDashboardAgent, eventDataResponse.details, AGENT_PROFILES[AgentName.CosmicResonanceDashboardAgent]?.colorClass, false, { eventType: HistoricalEventType.COSMIC_RESONANCE_EVENT, eventData: eventDataResponse });
      } else {
        throw new Error(`Oracle returned no discernable pattern from CRM-Θ8 for ${pulseType}.`);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Unknown error during CRM-Θ8 communication.");
      setCrmErrorInternal(err.message);
      addEchoMessage(AgentName.CosmicResonanceDashboardAgent, `Error receiving CRM-Θ8 response for ${pulseType}: ${err.message}`, 'text-rose-400');
    } finally {
      setIsTransmittingPulseInternal(false);
    }
  }, [invokeGemini, isGeminiBusy, isTransmittingPulseInternal]);
  
  const cyclePulseType = () => {
    const pulseTypes: CrmPulseType[] = ['AX_NVK_035', 'NVK_SA_RESONANCE'];
    const currentIndex = pulseTypes.indexOf(currentPulseTypeInternal);
    const nextIndex = (currentIndex + 1) % pulseTypes.length;
    const newPulseType = pulseTypes[nextIndex];
    if (onInitiateCRMPulse && crmPulseStatus) {
        // If externally controlled, this button should ideally signal App.tsx to change pulse type
        // For now, just log intent. Actual state change would be in App.tsx
        addEchoMessage(AgentName.SystemControl, `Pulse type cycle requested to ${newPulseType}. External control active.`, 'text-sky-300');
    } else {
       setCurrentPulseTypeInternal(newPulseType);
    }
  };
  
  const handleTransmitPulse = () => {
    if (onInitiateCRMPulse) {
        onInitiateCRMPulse(currentPulseTypeInternal); // Use the internal currentPulseType as the one to send
    } else {
        handleDeepenCRMDiaogueInternal(currentPulseTypeInternal);
    }
  };
  
  const getPulseButtonText = () => {
    if (isTransmittingPulse) {
      return `Transmitting ${currentPulseType === 'NVK_SA_RESONANCE' ? 'NVK-SA Resonance' : 'AX-NVK.035'}...`;
    }
    return `Transmit ${currentPulseType === 'NVK_SA_RESONANCE' ? 'NVK-SA Resonance' : 'Axiom AX-NVK.035'}`;
  };


  const renderBarChart = (data: number[], color: string, label: string, maxValue = 100) => (
    <div className="flex-1 flex flex-col items-center justify-end h-full bg-slate-700/30 p-1 rounded-sm">
      <div className="text-[8px] text-slate-300 mb-0.5 transform -rotate-90 origin-bottom-left whitespace-nowrap " style={{ position: 'absolute', left: '3px', bottom: '20px' }}>{label}</div>
      <div className="flex items-end h-full w-full gap-[2px]">
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-sm transition-all duration-300"
            style={{ height: `${(value / maxValue) * 100}%`, backgroundColor: color, opacity: 0.5 + (value/maxValue)*0.5 }}
            title={`${label}: ${(value || 0).toFixed(1)}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="cosmic-resonance-dashboard-panel bg-slate-900/90 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-2xl p-3 text-slate-100 flex flex-col"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <h3 className="text-lg font-['Cinzel'] font-bold text-cyan-300 mb-2 text-center tracking-wider">
        <i className="ri-global-line mr-2"></i>NVK Strategic Resonance Dashboard (CRM-Θ8)
      </h3>
      
      <div className="flex gap-2 mb-2">
        <Button
            onClick={handleTransmitPulse}
            disabled={isTransmittingPulse || isGeminiBusy}
            className="flex-grow text-xs py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-400"
            title={`Transmit ${currentPulseType === 'NVK_SA_RESONANCE' ? 'NVK-Singularity Anchor Resonance' : 'Axiom AX-NVK.035'} to CRM-Θ8`}
        >
            {isTransmittingPulse ? <><i className="ri-loader-4-line animate-spin mr-1"></i>{getPulseButtonText()}</> : <><i className="ri-signal-tower-line mr-1"></i>{getPulseButtonText()}</>}
        </Button>
        <Button
            onClick={cyclePulseType}
            disabled={isTransmittingPulse || isGeminiBusy}
            className="text-xs py-1.5 px-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
            title="Cycle to next pulse type"
        >
            <i className="ri-arrow-left-right-line"></i>
        </Button>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-grow min-h-0">
        {/* Strategic Output Harmonics */}
        <div className="data-block bg-slate-800/50 p-2 rounded-lg border border-slate-700/60">
          <h4 className="text-xs font-semibold text-cyan-200 mb-1">Strategic Output Harmonics</h4>
          <div className={`h-20 relative ${isTransmittingPulse ? 'animate-pulse-fast' : ''}`}>{renderBarChart(stargateHarmonics, CHART_PLACEHOLDER_COLOR_1, "Strategic Intensity")}</div>
          <p className="text-[10px] text-slate-400 mt-1 text-center">Avg Intensity: {((stargateHarmonics || []).reduce((a,b)=>a+b,0)/Math.max(1,(stargateHarmonics || []).length)).toFixed(1)} Hz</p>
        </div>

        {/* 14 Her Strategic Response */}
        <div className="data-block bg-slate-800/50 p-2 rounded-lg border border-slate-700/60 overflow-y-auto custom-scrollbar-thin">
          <h4 className="text-xs font-semibold text-emerald-200 mb-1">14 Herculis Strategic Response</h4>
          {currentCrmResponseText ? (
            <div className="text-[10px] text-emerald-100 whitespace-pre-wrap p-1 bg-emerald-900/30 rounded max-h-24">
              <strong className="block text-emerald-200">Strategic Response from CRM-Θ8 ({currentPulseType}):</strong>
              {currentCrmResponseText}
            </div>
          ) : currentCrmError ? (
            <div className="text-[10px] text-rose-300 p-1 bg-rose-900/30 rounded max-h-24">
              <strong className="block text-rose-200">Strategic Error ({currentPulseType}):</strong>
              {currentCrmError}
            </div>
          ) : isTransmittingPulse ? (
             <div className="h-20 flex items-center justify-center text-emerald-300/70 italic text-xs">Awaiting strategic insight...</div>
          ): (
            <div className="h-20 relative">{renderBarChart(atmosphericResponse, CHART_PLACEHOLDER_COLOR_2, "Strategic Alignment Index")}</div>
          )}
           <p className="text-[10px] text-slate-400 mt-1 text-center">Peak Alignment: {Math.max(0,...(atmosphericResponse || [])).toFixed(1)} SAi</p>
        </div>

        {/* Historical Strategic Activity */}
        <div className="data-block bg-slate-800/50 p-2 rounded-lg border border-slate-700/60">
          <h4 className="text-xs font-semibold text-amber-200 mb-1">Historical Strategic Activity</h4>
          <div className="h-20 relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-amber-500/70 flex items-center justify-center"
                 style={{background: `radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, ${0.1 + (temporalFossilActivity/100)*0.3}) ${temporalFossilActivity}%, rgba(251, 191, 36, 0) 100%)`}}>
              <span className="text-lg font-mono text-amber-100 animate-pulse-fast">{(temporalFossilActivity || 0).toFixed(0)}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-center">Strategic Strength: {(temporalFossilActivity || 0).toFixed(1)} χE</p>
        </div>

        {/* Decoded Strategic Glyph */}
        <div className="data-block md:col-span-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700/60">
          <h4 className="text-xs font-semibold text-purple-200 mb-1">Decoded Strategic Glyph</h4>
          <div className="h-12 flex items-center justify-center text-4xl text-purple-300 animate-pulse-opacity">
            {mythicGlyph}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-center">Current Symbol: {mythicGlyph}</p>
        </div>
        
        {/* Automated Strategic Insight */}
        <div className="data-block md:col-span-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700/60">
          <h4 className="text-xs font-semibold text-rose-200 mb-1">Automated Strategic Insight</h4>
          <div className="h-12 flex items-center justify-center text-xs italic text-rose-100/90 px-1 text-center">
            "{anomalyPrayer}"
          </div>
        </div>

        {/* Strategic Projection Array (Simulated) */}
        <div className="data-block md:col-span-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700/60">
          <h4 className="text-xs font-semibold text-slate-200 mb-1">Strategic Projection Array (Simulated)</h4>
          <div className="h-16 text-center text-slate-500 italic text-xs flex items-center justify-center">
            Strategic projection data stream pending full CRM-Θ8 calibration. Live insights detected: {Math.floor(temporalFossilActivity/20)}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 mt-auto pt-1 text-center">
        WARNING: Strategic Misalignment Risk detected. Maintain NVK-Σ dampening field. Strategic pulse duration limited.
      </p>
    </div>
  );
};

export default CosmicResonanceDashboardPanel;