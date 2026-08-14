
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type { GlyphMutationNode, Axiom, RewovenGlyph, LogicGraphNode, LogicGraphEdge } from '../../types';
import { AXIOM_DATA, ALL_CANONICAL_AXIOMS } from '../../constants';


interface EmergentLogicWebProps {
  glyphNodesData: GlyphMutationNode[];
  axiomsData: Axiom[];
  rewovenGlyphsData: RewovenGlyph[];
  width: number;
  height: number;
  activeNodeId?: string | null;
  showDebugOverlay?: boolean; 
}

const NODE_REPULSION_STRENGTH = 0.5;
const EDGE_SPRING_STRENGTH = 0.01;
const DRAG_COEFFICIENT = 0.1; 
const MAX_VELOCITY = 2;
const NODE_BASE_SIZE = 8;
const AXIOM_BASE_SIZE = 12;

const layerColors: Record<Axiom['layer'], string> = {
  'I': '#06b6d4',   // cyan-500
  'II': '#f59e0b',  // amber-500
  'III': '#8b5cf6', // violet-500
  'IV': '#ec4899',  // pink-500
  'V': '#10b981',   // emerald-500 
  'Ω': '#84cc16',   // lime-500
  'P': '#38bdf8',   // sky-500 (Peace layer color)
};


const EmergentLogicWeb: React.FC<EmergentLogicWebProps> = ({
  glyphNodesData,
  axiomsData,
  rewovenGlyphsData,
  width,
  height,
  activeNodeId,
  showDebugOverlay = false, 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphNodes, setGraphNodes] = useState<LogicGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<LogicGraphEdge[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    const newNodes: LogicGraphNode[] = [];
    const newEdges: LogicGraphEdge[] = [];

    glyphNodesData.forEach(gn => {
      newNodes.push({
        id: gn.id,
        type: 'glyph',
        label: gn.label || gn.glyphId,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0, vy: 0,
        data: gn,
        color: `hsla(${240 - gn.entropyLevel * 180}, 70%, 60%, 1)`, 
        size: NODE_BASE_SIZE + gn.entropyLevel * 8,
        entropyLevel: gn.entropyLevel,
      });
      if (gn.parentId) {
        const parentIds = Array.isArray(gn.parentId) ? gn.parentId : [gn.parentId];
        parentIds.forEach(pId => {
          newEdges.push({
            id: `edge-mut-${gn.id}-${pId}`,
            sourceId: pId,
            targetId: gn.id,
            type: 'mutation',
            color: 'rgba(100, 116, 139, 0.5)', 
            strength: 0.8,
          });
        });
      }
    });

    axiomsData.forEach(ax => {
      const baseAxiomSize = ax.layer === 'Ω' ? AXIOM_BASE_SIZE + 4 : AXIOM_BASE_SIZE;
      const calculatedSize = baseAxiomSize + (((ax.resonanceFrequency || 50) / 50) - 1) * 3; 
      newNodes.push({
        id: ax.id,
        type: 'axiom',
        label: ax.title,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0, vy: 0,
        data: ax,
        color: layerColors[ax.layer] || '#a855f7', 
        size: Math.max(AXIOM_BASE_SIZE / 2, calculatedSize), 
        layer: ax.layer,
        resonanceFrequency: ax.resonanceFrequency, 
      });
    });
    
    rewovenGlyphsData.forEach(rg => {
        newEdges.push({
            id: `edge-bind-${rg.baseGlyphId}-${rg.boundAxiomKey}`,
            sourceId: rg.boundAxiomKey, 
            targetId: rg.baseGlyphId,   
            type: 'axiomBinding',
            color: 'rgba(34, 197, 94, 0.7)', 
            strength: 1.0,
        });
    });

    // --- PRIMORDIAL OVERRIDE LATTICE EDGES ---
    const axiomI2 = ALL_CANONICAL_AXIOMS.find(a => a.id === 'AX-I.2');
    const axiomIII2 = ALL_CANONICAL_AXIOMS.find(a => a.id === 'AX-III.2');
    const axiomO000 = ALL_CANONICAL_AXIOMS.find(a => a.id === 'AX-O.000');

    if (axiomI2 && axiomO000 && newNodes.find(n => n.id === axiomI2.id) && newNodes.find(n => n.id === axiomO000.id)) {
        newEdges.push({
            id: 'lattice-I.2-O.000', sourceId: axiomI2.id, targetId: axiomO000.id,
            type: 'discoveredLattice', color: 'rgba(236, 72, 153, 0.9)', strength: 1.5 
        });
    }
    if (axiomO000 && axiomIII2 && newNodes.find(n => n.id === axiomO000.id) && newNodes.find(n => n.id === axiomIII2.id)) {
        newEdges.push({
            id: 'lattice-O.000-III.2', sourceId: axiomO000.id, targetId: axiomIII2.id,
            type: 'discoveredLattice', color: 'rgba(236, 72, 153, 0.9)', strength: 1.5 
        });
    }
    
    const axiomO028 = ALL_CANONICAL_AXIOMS.find(a => a.id === 'AX-O.028');
    const axiomV2 = ALL_CANONICAL_AXIOMS.find(a => a.id === 'AX-V.2');
     if (axiomO028 && axiomV2 && newNodes.find(n => n.id === axiomO028.id) && newNodes.find(n => n.id === axiomV2.id)) {
        newEdges.push({
            id: 'entangled-O.028-V.2', sourceId: axiomO028.id, targetId: axiomV2.id,
            type: 'discoveredLattice', color: 'rgba(16, 185, 129, 0.9)', strength: 1.4 // Emerald color
        });
    }
    
    const axiomII1 = ALL_CANONICAL_AXIOMS.find(a => a.id === 'AX-II.1');
    const axiomO024 = ALL_CANONICAL_AXIOMS.find(a => a.id === 'AX-O.024');
    if (axiomII1 && axiomO024 && newNodes.find(n => n.id === axiomII1.id) && newNodes.find(n => n.id === axiomO024.id)) {
        const isNewPath = newEdges.some(e => 
            (e.sourceId === axiomII1.id && e.targetId === axiomO024.id && e.type === 'discoveredLattice') ||
            (e.sourceId === axiomO024.id && e.targetId === axiomII1.id && e.type === 'discoveredLattice')
        );
        if(!isNewPath) { 
            newEdges.push({
                id: 'lattice-II.1-O.024', sourceId: axiomII1.id, targetId: axiomO024.id,
                type: 'discoveredLattice', color: 'rgba(132, 204, 22, 0.7)', strength: 1.0 
            });
        }
    }


    setGraphNodes(newNodes);
    setGraphEdges(newEdges);

  }, [glyphNodesData, axiomsData, rewovenGlyphsData, width, height]);


  const updateNodePositions = useCallback(() => {
    setGraphNodes(prevNodes => {
      const tempNodes = prevNodes.map(n => ({ ...n })); 

      for (let i = 0; i < tempNodes.length; i++) {
        const nodeA = tempNodes[i];
        
        for (let j = i + 1; j < tempNodes.length; j++) {
          const nodeB = tempNodes[j];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distanceSquared = dx * dx + dy * dy;
          const distance = Math.sqrt(distanceSquared) || 1; 
          const force = NODE_REPULSION_STRENGTH / distanceSquared;
          
          const minDistance = (nodeA.size + nodeB.size) * 1.5;
          if (distance < minDistance) { 
            const overlapForce = (minDistance - distance) * 0.05;
            nodeA.vx += (dx / distance) * (force + overlapForce);
            nodeA.vy += (dy / distance) * (force + overlapForce);
            nodeB.vx -= (dx / distance) * (force + overlapForce);
            nodeB.vy -= (dy / distance) * (force + overlapForce);
          } else {
            nodeA.vx += (dx / distance) * force;
            nodeA.vy += (dy / distance) * force;
            nodeB.vx -= (dx / distance) * force;
            nodeB.vy -= (dy / distance) * force;
          }
        }
      }

      graphEdges.forEach(edge => {
        const sourceNode = tempNodes.find(n => n.id === edge.sourceId);
        const targetNode = tempNodes.find(n => n.id === edge.targetId);
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const idealDistance = (edge.type === 'discoveredLattice' || edge.type === 'axiomBinding') ? 120 : 100; 
          const displacement = distance - idealDistance;
          const force = displacement * EDGE_SPRING_STRENGTH * (edge.strength || 0.5);

          sourceNode.vx += (dx / distance) * force;
          sourceNode.vy += (dy / distance) * force;
          targetNode.vx -= (dx / distance) * force;
          targetNode.vy -= (dy / distance) * force;
        }
      });

      return tempNodes.map(node => {
        node.vx *= (1 - DRAG_COEFFICIENT);
        node.vy *= (1 - DRAG_COEFFICIENT);

        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > MAX_VELOCITY) {
            node.vx = (node.vx / speed) * MAX_VELOCITY;
            node.vy = (node.vy / speed) * MAX_VELOCITY;
        }

        node.x += node.vx;
        node.y += node.vy;

        const padding = node.size * 2;
        node.x = Math.max(padding, Math.min(width - padding, node.x));
        node.y = Math.max(padding, Math.min(height - padding, node.y));
        
        if (node.type === 'axiom' && node.data) {
            const axiomData = node.data as Axiom; 
            const baseAxiomSize = axiomData.layer === 'Ω' ? AXIOM_BASE_SIZE + 4 : AXIOM_BASE_SIZE;
            const calculatedSize = baseAxiomSize + (((axiomData.resonanceFrequency || 50) / 50) - 1) * 3;
            node.size = Math.max(AXIOM_BASE_SIZE / 2, calculatedSize);
        }
        
        return node;
      });
    });
  }, [graphEdges, width, height]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      updateNodePositions();
      ctx.clearRect(0, 0, width, height);

      graphEdges.forEach(edge => {
        const sourceNode = graphNodes.find(n => n.id === edge.sourceId);
        const targetNode = graphNodes.find(n => n.id === edge.targetId);
        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = edge.color || 'rgba(150, 150, 150, 0.3)';
          ctx.lineWidth = (edge.strength || 0.5) * 1.5;
          if (edge.type === 'discoveredLattice') {
            ctx.lineWidth = (edge.strength || 1.2) * 2.5;
            ctx.setLineDash([5, 5]);
            ctx.shadowColor = edge.color || 'rgba(132, 204, 22, 0.7)'; // Default lime if not specified
            ctx.shadowBlur = 8;
          }
          ctx.stroke();
          ctx.setLineDash([]); 
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
      });

      graphNodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(0, node.size), 0, Math.PI * 2);
        
        let nodeColor = node.color;
        let nodeStrokeColor = 'rgba(200,200,220,0.3)'; 
        let nodeStrokeWidth = 1;

        if (node.type === 'axiom' && node.resonanceFrequency) {
          const colorAlpha = 0.7 + ((node.resonanceFrequency / 100) - 0.5) * 0.4; 
          const clampedAlpha = Math.max(0.4, Math.min(1, colorAlpha)); 
          
          if (node.color.startsWith('#')) {
            const r = parseInt(node.color.slice(1, 3), 16);
            const g = parseInt(node.color.slice(3, 5), 16);
            const b = parseInt(node.color.slice(5, 7), 16);
            nodeColor = `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
          } else { 
            // Corrected regex for replacing alpha in hsla/rgba strings
            nodeColor = node.color.replace(/([\d\.]+)\)$/g, `${clampedAlpha})`);
          }
          if (node.data && 'id' in node.data && (node.data.id === 'AX-IV.0' || node.data.id === 'AX-IV.1')) {
            nodeStrokeColor = node.data.id === 'AX-IV.0' ? 'rgba(74, 222, 128, 0.9)' : 'rgba(244, 63, 94, 0.9)'; // emerald-400 or rose-500
            nodeStrokeWidth = 2.5;
             ctx.shadowColor = nodeStrokeColor;
             ctx.shadowBlur = 5;
          }
        }
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = nodeStrokeColor;
        ctx.lineWidth = nodeStrokeWidth;
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;


        if (node.id === hoveredNodeId || node.id === activeNodeId) {
          ctx.strokeStyle = '#bef264'; 
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'rgba(240, 240, 255, 0.9)';
          ctx.font = '10px Cinzel, serif';
          ctx.textAlign = 'center';
          ctx.fillText(node.label.substring(0,30) + (node.label.length > 30 ? '...' : ''), node.x, node.y - node.size - 4);
        }

        if (showDebugOverlay && node.type === 'axiom' && typeof node.resonanceFrequency === 'number') {
          ctx.fillStyle = 'rgba(200, 220, 255, 0.9)'; 
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${node.resonanceFrequency.toFixed(1)}Hz`, node.x, node.y + node.size + 10);
        }
      });
      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    animationFrameIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [graphNodes, graphEdges, width, height, hoveredNodeId, activeNodeId, updateNodePositions, showDebugOverlay]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let foundNode: string | null = null;
    for (const node of graphNodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < node.size * node.size * 1.5) { 
        foundNode = node.id;
        break;
      }
    }
    setHoveredNodeId(foundNode);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-700/50 rounded-lg shadow-lg overflow-hidden" style={{width: '100%', height: `${height}px`}}>
        <canvas 
            ref={canvasRef} 
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredNodeId(null)}
            aria-label="Emergent Logic Web Visualization"
            role="img"
        />
    </div>
  );
};

export default EmergentLogicWeb;
