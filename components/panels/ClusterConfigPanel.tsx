import React, { useState } from 'react';
import { PANEL_DEFINITIONS } from '../../constants';
import { ClusterNode, PanelDefinition } from '../../types';

interface ClusterConfigPanelProps {
  nodes: ClusterNode[];
  onUpdateNodes: (nodes: ClusterNode[]) => void;
  clusterId: string;
}

const ClusterConfigPanel: React.FC<ClusterConfigPanelProps> = ({ nodes, onUpdateNodes, clusterId }) => {
  const [selectedPanelId, setSelectedPanelId] = useState<string>(PANEL_DEFINITIONS[0].id);

  const handleAddNode = () => {
    const panel = PANEL_DEFINITIONS.find(p => p.id === selectedPanelId);
    if (!panel) return;

    const newNode: ClusterNode = {
      id: `${clusterId}-node-${Date.now()}`,
      panelId: panel.id,
      label: panel.name
    };

    onUpdateNodes([...nodes, newNode]);
  };

  const handleRemoveNode = (nodeId: string) => {
    onUpdateNodes(nodes.filter(n => n.id !== nodeId));
  };

  const handleChangePanel = (nodeId: string, newPanelId: string) => {
    const panel = PANEL_DEFINITIONS.find(p => p.id === newPanelId);
    if (!panel) return;

    onUpdateNodes(nodes.map(n => 
      n.id === nodeId ? { ...n, panelId: newPanelId, label: panel.name } : n
    ));
  };

  return (
    <div className="cluster-config-panel h-full flex flex-col bg-slate-900 text-slate-100 p-4 font-sans overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20">
      <div className="flex items-center gap-2 mb-6 border-b border-cyan-500/20 pb-4">
        <i className="ri-settings-5-line text-cyan-400 text-xl"></i>
        <h2 className="text-lg font-bold tracking-tight uppercase">Cluster Configurator</h2>
      </div>

      <div className="add-node-section mb-8 p-4 bg-slate-950 rounded-lg border border-cyan-500/20 shadow-inner">
        <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-4">Spawn New Node</h3>
        <div className="flex gap-2">
          <select 
            value={selectedPanelId}
            onChange={(e) => setSelectedPanelId(e.target.value)}
            className="flex-grow bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs focus:border-cyan-500 outline-none transition-all"
          >
            {PANEL_DEFINITIONS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button 
            onClick={handleAddNode}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(0,255,179,0.2)]"
          >
            Spawn
          </button>
        </div>
      </div>

      <div className="active-nodes-section flex-grow">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex justify-between items-center">
          <span>Active Nodes ({nodes.length})</span>
          <span className="text-[10px] opacity-50 font-mono">{clusterId}</span>
        </h3>
        
        <div className="space-y-3">
          {nodes.map((node) => (
            <div key={node.id} className="node-item p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col gap-3 hover:border-cyan-500/30 transition-all group">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(0,255,179,0.5)]"></div>
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">{node.label}</span>
                </div>
                <button 
                  onClick={() => handleRemoveNode(node.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  title="Remove Node"
                >
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-bold">Panel Type</label>
                <select 
                  value={node.panelId}
                  onChange={(e) => handleChangePanel(node.id, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[10px] focus:border-cyan-500 outline-none transition-all"
                >
                  {PANEL_DEFINITIONS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="text-[8px] font-mono text-slate-600 truncate">
                ID: {node.id}
              </div>
            </div>
          ))}

          {nodes.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
              <i className="ri-ghost-line text-3xl text-slate-800 mb-2 block"></i>
              <p className="text-xs text-slate-600 italic">No nodes active in this cluster.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-800 text-[9px] text-slate-600 font-mono uppercase tracking-tighter flex justify-between">
        <span>System: Cluster_Manager_v2.0</span>
        <span className="text-cyan-900">Status: Nominal</span>
      </div>
    </div>
  );
};

export default ClusterConfigPanel;
