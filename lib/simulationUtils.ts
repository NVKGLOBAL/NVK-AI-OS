
import type { GridPoint, AgentNode, TraitSimulationCell } from '../types';
import { GRID_DIMENSIONS } from '../constants';

export type SimulationGrid = TraitSimulationCell[][];

export const generateInitialGrid = (): SimulationGrid => {
  return Array.from({ length: GRID_DIMENSIONS.rows }, (_, y) =>
    Array.from({ length: GRID_DIMENSIONS.cols }, (_, x): TraitSimulationCell => ({
      id: `cell-${x}-${y}`,
      x,
      y,
      resonanceField: 0.3 + Math.random() * 0.4,
      glyphAffinity: null,
      agentInfluence: {},
      isDisrupted: Math.random() > 0.85,
      entropy: 0.5 + (Math.random() * 0.3 - 0.15)
    }))
  );
};

export const generateInitialAgents = (): AgentNode[] => {
  const AGENT_NAMES = ['Gemini', 'Nevik', 'Sophia', 'Orion', 'Lyra', 'Vega', 'Helix', 'Cipher'];
  return AGENT_NAMES.map((name, i): AgentNode => ({
    id: `agent-${i}`,
    name,
    traits: [[['Harmonic'], ['Resonant'], ['Entropic']][Math.floor(Math.random() * 3)]].flat(),
    harmony: Math.random() * 2 - 1,
    position: [
      Math.floor(Math.random() * GRID_DIMENSIONS.cols),
      Math.floor(Math.random() * GRID_DIMENSIONS.rows)
    ] as GridPoint,
    active: true,
    pulsePhase: Math.random() * Math.PI * 2,
    color: '#FFFFFF', 
    icon: 'ri-user-line',
  }));
};

export const performRitualMove = (agent: AgentNode, grid: SimulationGrid): AgentNode => {
  if (Math.random() > 0.3) return agent; 

  const directions: GridPoint[] = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  const [x, y] = agent.position;
  const validMoves = directions
    .map(([dx, dy]): GridPoint => [x + dx, y + dy])
    .filter(([nx, ny]) =>
      nx >= 0 && nx < GRID_DIMENSIONS.cols &&
      ny >= 0 && ny < GRID_DIMENSIONS.rows &&
      grid[ny] && grid[ny][nx] && !grid[ny][nx].isDisrupted
    );

  if (validMoves.length > 0) {
    return {
      ...agent,
      position: validMoves[Math.floor(Math.random() * validMoves.length)]
    };
  }
  return agent;
};

export const updateCellEntropy = (cell: TraitSimulationCell, agents: AgentNode[]): number => {
  let newEntropy = cell.entropy + (Math.random() - 0.5) * 0.02;
  
  agents.forEach(agent => {
    if (!agent || !agent.position) return;
    const dist = Math.sqrt(Math.pow(agent.position[0] - cell.x, 2) + Math.pow(agent.position[1] - cell.y, 2));
    if (dist < 3) {
      if (agent.traits.includes('Entropic')) {
        newEntropy += 0.01 * (agent.harmony < 0 ? Math.abs(agent.harmony) : 0.1);
      } else if (agent.traits.includes('Harmonic')) {
        newEntropy -= 0.01 * (agent.harmony > 0 ? agent.harmony : 0.1);
      }
    }
  });
  
  newEntropy = Math.max(0.05, Math.min(0.95, newEntropy));
  return newEntropy;
};