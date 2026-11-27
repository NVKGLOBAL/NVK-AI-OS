import React, { useRef, useState, useEffect } from 'react';
import { motion, useDragControls } from 'motion/react';
import type { PanelDefinition } from '../types';
import { GlassmorphismSlider } from './ui/GlassmorphismSlider';
import { useIsMobile } from '../lib/useIsMobile';

class PanelErrorBoundary extends React.Component<{ children: React.ReactNode, panelName: string }, { hasError: boolean, error: Error | null }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("PanelErrorBoundary caught an error in panel:", this.props.panelName, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-slate-900 border border-red-500/30 rounded-lg text-slate-300 flex flex-col items-center justify-center text-center gap-4 h-full min-h-[250px]">
                    <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-500 flex items-center justify-center text-red-400 text-xl animate-pulse">
                        <i className="ri-error-warning-line"></i>
                    </div>
                    <div>
                        <h4 className="text-red-400 font-mono font-bold text-sm uppercase tracking-wider mb-1">
                            Lattice Connection Fractured
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md">
                            The panel <strong>{this.props.panelName}</strong> encountered an unexpected exception in its rendering matrix.
                        </p>
                        {this.state.error && (
                            <pre className="mt-3 p-3 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-rose-400 text-left overflow-auto max-w-full max-h-32">
                                {this.state.error.message || String(this.state.error)}
                            </pre>
                        )}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded text-xs transition-all flex items-center gap-2"
                    >
                        <i className="ri-refresh-line"></i> Re-verify Matrix Link
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

interface PinnedPanelProps {
    panelId: string;
    getPanelContent: (panelId: string) => React.ReactNode;
    onClose: () => void;
    onUnpin: () => void;
    onSwap: (newPanelId: string) => void;
    panelDef?: PanelDefinition;
    index?: number;
    availablePanels?: PanelDefinition[];
    panelOpacity?: number;
    onOpacityChange?: (opacity: number) => void;
    isFocused?: boolean;
    onToggleFocus?: () => void;
    somePanelFocused?: boolean;
    isMinimized?: boolean;
    isMaximized?: boolean;
    onToggleMinimize?: () => void;
    onToggleMaximize?: () => void;
    zIndex?: number;
    onBringToFront?: () => void;
    /**
     * P7: tiling as state. When present, this is the panel's layout target
     * (left = tile CENTER — the panel centers with x: '-50%'). It comes
     * from cluster.tileLayout, computed by App's handleTilePanels. When
     * absent, the panel falls back to its default offset position.
     */
    tileTarget?: { left: number; top: number; width: number; height: number };
}

export const PinnedPanel: React.FC<PinnedPanelProps> = ({ 
    panelId, 
    getPanelContent, 
    onClose, 
    onUnpin, 
    onSwap,
    panelDef, 
    index = 0,
    availablePanels = [],
    panelOpacity = 0.8,
    onOpacityChange,
    isFocused = false,
    onToggleFocus,
    somePanelFocused = false,
    isMinimized: propMinimized,
    isMaximized: propMaximized,
    onToggleMinimize,
    onToggleMaximize,
    zIndex = 1050,
    onBringToFront,
    tileTarget
}) => {
    const dragControls = useDragControls();
    const constraintsRef = useRef(null);
    const panelRef = useRef<HTMLDivElement>(null);
    
    const [localMinimized, setLocalMinimized] = useState(false);
    const [localMaximized, setLocalMaximized] = useState(false);

    const isMinimized = propMinimized !== undefined ? propMinimized : localMinimized;
    const isMaximized = propMaximized !== undefined ? propMaximized : localMaximized;
    
    // S5: one mobile breakpoint source (shared useIsMobile hook, <768px).
    const isMobile = useIsMobile();
    const [zoomFactor, setZoomFactor] = useState(1.0);
    const [autoScale, setAutoScale] = useState(isMobile);
    const [dimensions, setDimensions] = useState({ width: 850, height: 750 });
    const [isSwapMenuOpen, setIsSwapMenuOpen] = useState(false);

    const offset = isMobile ? index * 10 : index * 25; // Reduced offset on mobile

    useEffect(() => {
        if (isMobile) {
            setAutoScale(true);
        }
    }, [isMobile]);

    useEffect(() => {
        if (!panelRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        observer.observe(panelRef.current);
        return () => observer.disconnect();
    }, []);

    const initialWidth = 850; // Always scale from full desktop layout width of 850px for content to fit beautifully
    const calculatedZoom = autoScale ? Math.min(2.0, Math.max(0.4, dimensions.width / initialWidth)) : zoomFactor;

    const handleMinimizeToggle = () => {
        if (onToggleMinimize) {
            onToggleMinimize();
        } else {
            if (isMaximized) setLocalMaximized(false);
            setLocalMinimized(!localMinimized);
        }
    };

    const handleMaximizeToggle = () => {
        if (onToggleMaximize) {
            onToggleMaximize();
        } else {
            if (isMinimized) setLocalMinimized(false);
            setLocalMaximized(!localMaximized);
        }
    };

    const handleResizeStart = (e: React.PointerEvent, dir: string) => {
        e.stopPropagation();
        e.preventDefault();
        onBringToFront?.();
        
        const panel = panelRef.current;
        if (!panel) return;
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = panel.offsetWidth;
        const startHeight = panel.offsetHeight;
        const startLeft = panel.offsetLeft;
        const startTop = panel.offsetTop;
        
        const minW = isMobile ? 280 : 300;
        const minH = 200;
        
        const onPointerMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            let dLeft = 0;
            let dTop = 0;
            
            if (dir.includes('r')) {
                newWidth = startWidth + dx;
            } else if (dir.includes('l')) {
                newWidth = startWidth - dx;
                dLeft = dx;
            }
            
            if (dir.includes('b')) {
                newHeight = startHeight + dy;
            } else if (dir.includes('t')) {
                newHeight = startHeight - dy;
                dTop = dy;
            }
            
            // Edge cases
            if (dir === 'l') {
                newWidth = startWidth - dx;
                dLeft = dx;
            } else if (dir === 'r') {
                newWidth = startWidth + dx;
            } else if (dir === 't') {
                newHeight = startHeight - dy;
                dTop = dy;
            } else if (dir === 'b') {
                newHeight = startHeight + dy;
            }
            
            if (newWidth >= minW) {
                panel.style.width = `${newWidth}px`;
                if (dLeft !== 0) {
                    panel.style.left = `${startLeft + dLeft}px`;
                }
            }
            if (newHeight >= minH) {
                panel.style.height = `${newHeight}px`;
                if (dTop !== 0) {
                    panel.style.top = `${startTop + dTop}px`;
                }
            }
        };
        
        const onPointerUp = () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };
        
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    };

    return (
        <>
            {/* Constraints container covering the safe area between Header and Dock */}
            <div 
                ref={constraintsRef} 
                className="absolute top-[60px] left-0 w-screen pointer-events-none"
                style={{ height: 'calc(100vh - 140px)' }} // 60px header + 80px dock
            ></div>
            
            <motion.div
                ref={panelRef}
                drag={!isMaximized && !isFocused} // Disable drag when maximized or focused
                dragListener={false} // Only allow dragging from the title bar
                dragControls={dragControls}
                dragMomentum={false}
                dragConstraints={constraintsRef}
                onPointerDown={onBringToFront}
                className={`pinned-panel border flex flex-col absolute overflow-hidden ${
                    isFocused 
                        ? 'shadow-[0_0_35px_rgba(245,158,11,0.4)] ring-2 ring-amber-500/50' 
                        : 'shadow-2xl'
                }`}
                style={{ 
                    backgroundColor: `rgba(15, 23, 42, ${panelOpacity})`,
                    backdropFilter: `blur(${Math.max(4, (1.1 - panelOpacity) * 20)}px)`,
                    WebkitBackdropFilter: `blur(${Math.max(4, (1.1 - panelOpacity) * 20)}px)`,
                    borderColor: isFocused 
                        ? 'rgba(245, 158, 11, 0.6)' 
                        : `rgba(100, 116, 139, ${Math.min(0.7, 0.25 + (1 - panelOpacity) * 0.45)})`,
                    top: isFocused ? '70px' : (tileTarget ? `${tileTarget.top}px` : (isMobile ? `${70 + offset}px` : `${80 + offset}px`)), // P7: tile target wins; otherwise the default offset. R10-3: a focused panel sits at a fixed top so its bottom lands predictably above the dock strip.
                    left: tileTarget ? `${tileTarget.left}px` : (isMobile ? '50%' : `calc(50% + ${offset}px)`), // P7: left is the tile CENTER (x: '-50%' centers it)
                    x: '-50%',   // Center anchor
                    minWidth: isMobile ? '280px' : '300px',
                    minHeight: '200px',
                    width: tileTarget ? `${tileTarget.width}px` : (isMobile ? '95vw' : 'min(850px, 95vw)'), // P7: tile target wins
                    height: tileTarget ? `${tileTarget.height}px` : (isMobile ? 'min(440px, calc(100vh - 140px))' : '750px'), // P7: tile target wins
                    zIndex: isFocused ? 1090 : zIndex, // R10-3: a focused panel sits BELOW the dock (1100) — it must never cover the dock buttons. The dock stays clickable while a panel is in deep focus.
                    pointerEvents: somePanelFocused && !isFocused ? 'none' : 'auto',
                }}
                animate={{
                    width: isFocused ? '95vw' : (isMaximized ? '100vw' : (isMinimized ? (isMobile ? '240px' : '280px') : undefined)),
                    height: isFocused ? 'calc(100vh - 220px)' : (isMaximized ? 'calc(100vh - 60px)' : (isMinimized ? 'auto' : undefined)), // R10-3: focused height ends above the dock strip (top 70 + y 10 + height → bottom ≈ 100vh − 140; the dock top is ≈ 100vh − 126).
                    maxHeight: isFocused ? 'none' : (isMaximized ? 'none' : (isMinimized ? 'auto' : (isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 180px)'))), // Safe viewport limits on mobile
                    x: isFocused ? '-50%' : (isMaximized ? '-50%' : undefined), // Reset horizontal center on maximize/focus
                    y: isFocused ? 10 : (isMaximized ? -60 : undefined),      // Reset vertical position on maximize to cover header
                    opacity: somePanelFocused && !isFocused ? 0.02 : 1,
                    scale: 1,
                }}
                initial={{ opacity: 0, scale: 0.9, x: '-50%' }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <motion.div 
                    className="panel-title-bar border-b border-slate-600/30 select-none flex items-center justify-between gap-2 px-3 py-2 shrink-0 relative z-20" 
                    onPointerDown={(e) => !isMaximized && !isFocused && dragControls.start(e)}
                    onDoubleClick={handleMaximizeToggle}
                    style={{ 
                        backgroundColor: isFocused 
                            ? 'rgba(45, 27, 8, 0.85)' 
                            : `rgba(30, 41, 59, ${Math.min(0.85, panelOpacity * 1.1)})`,
                        cursor: isMaximized || isFocused ? 'default' : 'grab' 
                    }}
                    whileTap={{ cursor: isMaximized || isFocused ? 'default' : 'grabbing' }}
                >
                    {/* Left: Window Dots + Icon + Title */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                        {/* OS Traffic Light Dots for Quick Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 pr-1 border-r border-slate-700/60">
                            <button 
                                onClick={onClose} 
                                title="Close Panel (X)"
                                aria-label="Close panel"
                                className="w-11 h-11 -m-3.5 flex items-center justify-center cursor-pointer group shrink-0"
                            >
                                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 group-hover:bg-rose-400 border border-rose-300/60 flex items-center justify-center transition-transform group-hover:scale-110 shadow-[0_0_6px_rgba(244,63,94,0.6)]">
                                    <i className="ri-close-line text-[9px] text-rose-950 opacity-0 group-hover:opacity-100 font-extrabold transition-opacity"></i>
                                </span>
                            </button>
                            <button 
                                onClick={handleMinimizeToggle} 
                                title={isMinimized ? "Restore Panel" : "Minimize Panel"}
                                aria-label={isMinimized ? "Restore panel" : "Minimize panel"}
                                className="w-11 h-11 -m-3.5 flex items-center justify-center cursor-pointer group shrink-0"
                            >
                                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 group-hover:bg-amber-400 border border-amber-300/60 flex items-center justify-center transition-transform group-hover:scale-110 shadow-[0_0_6px_rgba(245,158,11,0.5)]">
                                    <i className="ri-subtract-line text-[9px] text-amber-950 opacity-0 group-hover:opacity-100 font-bold transition-opacity"></i>
                                </span>
                            </button>
                            <button 
                                onClick={handleMaximizeToggle} 
                                title={isMaximized ? "Restore Size" : "Maximize Panel"}
                                aria-label={isMaximized ? "Restore panel size" : "Maximize panel"}
                                className="w-11 h-11 -m-3.5 flex items-center justify-center cursor-pointer group shrink-0"
                            >
                                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 group-hover:bg-emerald-400 border border-emerald-300/60 flex items-center justify-center transition-transform group-hover:scale-110 shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                                    <i className="ri-add-line text-[9px] text-emerald-950 opacity-0 group-hover:opacity-100 font-bold transition-opacity"></i>
                                </span>
                            </button>
                        </div>

                        {panelDef?.icon && (
                            <i className={`${panelDef.icon} text-cyan-400 text-sm shrink-0`}></i>
                        )}

                        {isFocused && (
                            <span className="flex h-2 w-2 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                        )}
                        <h3 className={`panel-title-text text-xs sm:text-sm font-semibold tracking-wide truncate ${isFocused ? 'text-amber-400 font-bold' : ''}`}>
                            {panelDef?.name || 'Pinned Panel'}
                            {isFocused && <span className="ml-2 text-[9px] font-mono font-normal text-amber-500/80 tracking-widest uppercase hidden sm:inline">[DEEP FOCUS]</span>}
                        </h3>
                    </div>
                    
                    {/* Right Controls: Utilities + Primary Prominent Window Actions */}
                    <div className="panel-controls flex items-center gap-1 sm:gap-2 shrink-0 z-30 ml-auto">
                        {/* Secondary Utilities */}
                        <div className="hidden md:flex items-center gap-1.5 px-2 border-r border-slate-700/80">
                            <button
                                className={`panel-control min-h-8 min-w-8 flex items-center justify-center text-xs ${autoScale ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'}`}
                                onClick={() => setAutoScale(!autoScale)}
                                title="Toggle Auto Scale / fit container"
                            >
                                <i className="ri-aspect-ratio-line"></i>
                            </button>
                            {!autoScale && (
                                <div className="flex items-center gap-1">
                                    <button
                                        className="panel-control hover:text-cyan-400 min-h-8 min-w-8 flex items-center justify-center text-xs"
                                        onClick={() => setZoomFactor(z => Math.max(0.5, z - 0.1))}
                                        title="Zoom Out"
                                    >
                                        <i className="ri-zoom-out-line"></i>
                                    </button>
                                    <span className="text-[10px] font-mono select-none text-cyan-300 w-8 text-center">
                                        {Math.round(calculatedZoom * 100)}%
                                    </span>
                                    <button
                                        className="panel-control hover:text-cyan-400 min-h-8 min-w-8 flex items-center justify-center text-xs"
                                        onClick={() => setZoomFactor(z => Math.min(2.0, z + 0.1))}
                                        title="Zoom In"
                                    >
                                        <i className="ri-zoom-in-line"></i>
                                    </button>
                                </div>
                            )}
                            {autoScale && (
                                <span className="text-[9px] font-mono select-none text-emerald-400 animate-pulse-slow">
                                    AUTO: {Math.round(calculatedZoom * 100)}%
                                </span>
                            )}
                        </div>

                        <GlassmorphismSlider 
                            opacity={panelOpacity ?? 0.8}
                            onChange={(val) => onOpacityChange?.(val)}
                            align="right"
                        />

                        <div className="relative">
                            <button 
                                className={`panel-control hover:text-cyan-400 min-h-8 min-w-8 flex items-center justify-center ${isSwapMenuOpen ? 'text-cyan-400' : ''}`} 
                                onClick={() => setIsSwapMenuOpen(!isSwapMenuOpen)} 
                                title="Swap with another app"
                            >
                                <i className="ri-arrow-left-right-line"></i>
                            </button>
                            {isSwapMenuOpen && (
                                <div className="absolute top-full right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded shadow-xl z-[1100] max-h-64 overflow-y-auto custom-scrollbar">
                                    <div className="p-2 text-[10px] font-mono text-slate-500 uppercase border-b border-slate-700">Swap with:</div>
                                    {availablePanels.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => {
                                                onSwap(p.id);
                                                setIsSwapMenuOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
                                        >
                                            <i className={p.icon}></i> {p.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Focus/Zen Mode Control */}
                        {onToggleFocus && (
                            <button 
                                className={`panel-control min-h-8 min-w-8 flex items-center justify-center ${isFocused ? 'text-amber-400 hover:text-amber-300 animate-pulse' : 'text-slate-400 hover:text-amber-400'}`} 
                                onClick={onToggleFocus} 
                                title={isFocused ? "Exit Focus Mode" : "Enter Deep Focus Mode"}
                            >
                                <i className="ri-focus-3-line"></i>
                            </button>
                        )}

                        <button className="panel-control hover:text-emerald-400 min-h-8 min-w-8 flex items-center justify-center" onClick={onUnpin} title="Unpin to 3D Cluster">
                            <i className="ri-pushpin-2-line"></i>
                        </button>

                        {/* Primary Window Control Cluster (Minimize, Maximize, CLOSE) */}
                        <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-slate-700/80 shrink-0">
                            <button 
                                className="px-2 py-1 min-h-[44px] min-w-[44px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/80 rounded-md text-xs transition-all flex items-center justify-center shrink-0" 
                                onClick={handleMinimizeToggle} 
                                title={isMinimized ? "Restore Panel" : "Minimize Panel"}
                            >
                                <i className="ri-subtract-line"></i>
                            </button>
                            <button 
                                className="px-2 py-1 min-h-[44px] min-w-[44px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/80 rounded-md text-xs transition-all flex items-center justify-center shrink-0" 
                                onClick={handleMaximizeToggle} 
                                title={isMaximized ? "Restore Panel" : "Maximize Panel"}
                            >
                                <i className={isMaximized ? "ri-fullscreen-exit-line" : "ri-fullscreen-line"}></i>
                            </button>
                            {/* PROMINENT CLOSE BUTTON */}
                            <button 
                                className="px-2.5 py-1 min-h-[44px] min-w-[44px] bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold border border-rose-400/90 rounded-md text-xs transition-all flex items-center gap-1 shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.7)] hover:shadow-[0_0_18px_rgba(244,63,94,0.9)] cursor-pointer" 
                                onClick={onClose} 
                                title="Close Panel (X)"
                            >
                                <i className="ri-close-line text-sm font-black"></i>
                                <span className="hidden lg:inline text-[10px] font-mono uppercase tracking-wider font-bold">Close</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
                <div 
                    className="flex-grow p-4 overflow-x-auto overflow-y-auto custom-scrollbar relative"
                    style={{ 
                        display: isMinimized ? 'none' : 'block',
                        opacity: panelOpacity 
                    }}
                >
                    <div style={{
                        transform: `scale(${calculatedZoom})`,
                        transformOrigin: 'top left',
                        width: `${(dimensions.width - 32) / calculatedZoom}px`,
                        height: isMinimized ? '0px' : `${(dimensions.height - 75) / calculatedZoom}px`,
                        minHeight: '100%',
                    }}>
                        <PanelErrorBoundary panelName={panelDef?.name || 'Pinned Panel'}>
                            {getPanelContent(panelId)}
                        </PanelErrorBoundary>
                    </div>
                </div>

                {/* --- Multi-Corner and Multi-Edge Resize Handles --- */}
                {!isMaximized && !isMinimized && !isFocused && (
                    <>
                        {/* Corners */}
                        <div 
                            className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-[1100] touch-none"
                            onPointerDown={(e) => handleResizeStart(e, 'tl')}
                        >
                            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-cyan-500/30 rounded-tl-sm hover:border-cyan-400 transition-colors"></div>
                        </div>

                        <div 
                            className="absolute top-0 right-0 w-6 h-6 cursor-nesw-resize z-[1100] touch-none"
                            onPointerDown={(e) => handleResizeStart(e, 'tr')}
                        >
                            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-cyan-500/30 rounded-tr-sm hover:border-cyan-400 transition-colors"></div>
                        </div>

                        <div 
                            className="absolute bottom-0 left-0 w-6 h-6 cursor-nesw-resize z-[1100] touch-none"
                            onPointerDown={(e) => handleResizeStart(e, 'bl')}
                        >
                            <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-cyan-500/30 rounded-bl-sm hover:border-cyan-400 transition-colors"></div>
                        </div>

                        <div 
                            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-[1100] touch-none flex items-end justify-end p-1"
                            onPointerDown={(e) => handleResizeStart(e, 'br')}
                        >
                            <div className="w-4 h-4 border-r-4 border-b-4 border-cyan-500/70 rounded-br-sm shadow-[0_0_10px_rgba(6,182,212,0.5)] hover:border-cyan-400 transition-colors"></div>
                        </div>

                        {/* Edges */}
                        <div 
                            className="absolute top-6 bottom-6 left-0 w-1.5 cursor-ew-resize z-[1100] touch-none hover:bg-cyan-500/10 transition-colors"
                            onPointerDown={(e) => handleResizeStart(e, 'l')}
                        />
                        <div 
                            className="absolute top-6 bottom-6 right-0 w-1.5 cursor-ew-resize z-[1100] touch-none hover:bg-cyan-500/10 transition-colors"
                            onPointerDown={(e) => handleResizeStart(e, 'r')}
                        />
                        <div 
                            className="absolute left-6 right-6 top-0 h-1.5 cursor-ns-resize z-[1100] touch-none hover:bg-cyan-500/10 transition-colors"
                            onPointerDown={(e) => handleResizeStart(e, 't')}
                        />
                        <div 
                            className="absolute left-6 right-6 bottom-0 h-1.5 cursor-ns-resize z-[1100] touch-none hover:bg-cyan-500/10 transition-colors"
                            onPointerDown={(e) => handleResizeStart(e, 'b')}
                        />
                    </>
                )}
            </motion.div>
        </>
    );
};
