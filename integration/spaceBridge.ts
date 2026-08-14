import * as THREE from 'three';
import { parseSkillMarkdown, executeGlyphImplementation, GlyphToolDefinition } from './skillParser';

type AgentActionType = 'BUILD_TOOL' | 'MODIFY_UI' | 'EXECUTE_JS' | 'SAVE_STATE' | 'CORE_SYNC';

interface AgentAction {
  id: string;
  type: AgentActionType;
  toolDefinition?: GlyphToolDefinition;
  glyphId?: string;
  modifications?: any;
  code?: string;
}

/**
 * NVKSpaceBridge connects the Space-Agent engine to the Three.js OS environment.
 */
export class NVKSpaceBridge {
  private threeScene: THREE.Scene;
  private agentCore: any; // Ref to AgentCore control
  private glyphSystem: any; // Ref to Glyph management in JarvisDesktop3D
  
  constructor(threeScene: THREE.Scene, agentCore: any, glyphSystem: any) {
    this.threeScene = threeScene;
    this.agentCore = agentCore;
    this.glyphSystem = glyphSystem;
    
    console.log("NVK Space Bridge Initialized: Nexus Intelligence Layer Synced.");
  }

  /**
   * Translates incoming agent-generated Skills (markdown) into active 3D Glyphs.
   */
  public async handleSkillManifestation(skillMarkdown: string) {
    const toolDef = parseSkillMarkdown(skillMarkdown);
    console.log(`[NVK BRIDGE] Skill Manifesting: ${toolDef.name}`);
    
    return await this.handleAgentAction({
      id: `act-${Date.now()}`,
      type: 'BUILD_TOOL',
      toolDefinition: toolDef
    });
  }

  public async handleAgentAction(action: AgentAction) {
    switch (action.type) {
      case 'BUILD_TOOL':
        if (!action.toolDefinition) return;
        
        // Visual feedback on Core
        if (this.agentCore?.setCoreState) {
          this.agentCore.setCoreState('creating');
        }
        
        // Extrude new glyph into orbit
        const newGlyphId = await this.glyphSystem?.extrudeGlyph?.(action.toolDefinition);
        
        // If implementation exists, execute it
        if (action.toolDefinition.implementation) {
          executeGlyphImplementation(action.toolDefinition.implementation, {
            scene: this.threeScene,
            THREE: THREE
          });
        }
        
        return newGlyphId;

      case 'MODIFY_UI':
        console.log(`[NVK BRIDGE] Reshaping Glyph: ${action.glyphId}`);
        // Logic to update existing 3D panels
        break;

      case 'EXECUTE_JS':
        console.log(`[NVK BRIDGE] Executing Direct Intelligence Injection.`);
        if (action.code) {
          executeGlyphImplementation(action.code, {
            scene: this.threeScene,
            THREE: THREE
          });
        }
        break;

      case 'SAVE_STATE':
        console.log(`[NVK BRIDGE] Persisting Nexus State to Lattice Storage.`);
        // Call persistence logic
        break;
        
      case 'CORE_SYNC':
        if (this.agentCore?.setCoreState && action.modifications?.state) {
            this.agentCore.setCoreState(action.modifications.state);
        }
        break;
    }
  }

  /**
   * Exposes the current 3D spatial state to the agent for context-aware reasoning.
   */
  public getSpatialContext() {
    return {
      core: {
        active: !!this.agentCore,
        state: this.agentCore?.state || 'unknown',
      },
      glyphs: this.glyphSystem?.getAllGlyphs() || [],
      timestamp: Date.now(),
      nexusVersion: 'Sovereign-Tier-1.0'
    };
  }
}
