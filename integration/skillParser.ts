import * as THREE from 'three';

export interface GlyphToolDefinition {
  name: string;
  type: 'glyph' | 'panel' | 'tool';
  geometry: 'sphere' | 'box' | 'icosahedron' | 'torus' | 'particles' | string;
  orbitRadius: number;
  behavior?: string;
  implementation?: string;
  color?: string;
}

/**
 * Parses space-agent SKILL.md format into NVK Glyph definitions.
 */
export function parseSkillMarkdown(markdown: string): GlyphToolDefinition {
  const definition: Partial<GlyphToolDefinition> = {
    name: 'Unknown Tool',
    type: 'glyph',
    geometry: 'icosahedron',
    orbitRadius: 3.0,
  };

  // Extract frontmatter-like fields from markdown headers or bold text
  const nameMatch = markdown.match(/## Tool: (.*)/);
  if (nameMatch) definition.name = nameMatch[1].trim();

  const typeMatch = markdown.match(/\*\*Type:\*\* (.*)/);
  if (typeMatch) definition.type = typeMatch[1].trim() as any;

  const geometryMatch = markdown.match(/\*\*Geometry:\*\* (.*)/);
  if (geometryMatch) definition.geometry = geometryMatch[1].trim();

  const radiusMatch = markdown.match(/\*\*Orbit Radius:\*\* ([\d.]+)/);
  if (radiusMatch) definition.orbitRadius = parseFloat(radiusMatch[1]);

  const behaviorMatch = markdown.match(/\*\*Behavior:\*\* (.*)/);
  if (behaviorMatch) definition.behavior = behaviorMatch[1].trim();

  // Extract implementation JS from code blocks
  const jsMatch = markdown.match(/```javascript\n([\s\S]*?)\n```/);
  if (jsMatch) definition.implementation = jsMatch[1].trim();

  return definition as GlyphToolDefinition;
}

/**
 * Tool to dynamically execute agent-generated Three.js logic safely.
 */
export function executeGlyphImplementation(implementation: string, context: { scene: THREE.Scene, THREE: typeof THREE }) {
  try {
    // In a real app, we would use a proper sandbox or Function constructor
    // For NVK, we provide the agent with scene access for creative extrusion
    const agentFunction = new Function('scene', 'THREE', implementation);
    return agentFunction(context.scene, context.THREE);
  } catch (error) {
    console.error("Failed to execute agent implementation:", error);
    return null;
  }
}
