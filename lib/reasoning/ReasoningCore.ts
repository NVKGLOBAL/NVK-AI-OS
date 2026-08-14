
import { driftDB } from '../../db';
import type { ThoughtNode, ReasoningPath, ReflectionResult, Episode, Pattern, Skill } from '../../types';

// Define a generic LLM caller type
type LLMCaller = (prompt: string, systemPrompt?: string) => Promise<string | null>;

// ============================================================
// 1. ADVANCED REASONING ENGINE (Tree of Thought)
// ============================================================

export class TreeOfThoughtReasoner {
  private maxDepth: number;
  private branchingFactor: number;
  private thoughtTree: Map<string, ThoughtNode>;
  private invokeGemini: LLMCaller;
  
  constructor(invokeGemini: LLMCaller, maxDepth = 3, branchingFactor = 3) {
    this.maxDepth = maxDepth;
    this.branchingFactor = branchingFactor;
    this.thoughtTree = new Map();
    this.invokeGemini = invokeGemini;
  }

  async solve(problem: string, context?: any): Promise<ReasoningPath> {
    console.log(`🌳 Starting Tree-of-Thought reasoning for: "${problem}"`);
    this.thoughtTree.clear();
    
    // 1. Create root node
    const rootNode = this.createThoughtNode(problem, null, 0, context);
    this.thoughtTree.set(rootNode.id, rootNode);

    // 2. Build reasoning tree
    await this.expandTree(rootNode);

    // 3. Evaluate all paths
    const allPaths = this.extractAllPaths();
    if (allPaths.length === 0) {
        throw new Error("No reasoning paths generated.");
    }

    const evaluatedPaths = await Promise.all(
      allPaths.map(path => this.evaluatePath(path))
    );

    // 4. Select best path
    const bestPath = evaluatedPaths.reduce((best, current) => 
      current.totalConfidence > best.totalConfidence ? current : best
    );

    console.log(`✅ Best reasoning path found with confidence: ${bestPath.totalConfidence.toFixed(2)}`);
    
    return bestPath;
  }

  private async expandTree(node: ThoughtNode): Promise<void> {
    if (node.depth >= this.maxDepth) {
      return;
    }

    const nextSteps = await this.generateNextSteps(node, this.branchingFactor);

    for (const step of nextSteps) {
      const childNode = this.createThoughtNode(
        step.content,
        node.id,
        node.depth + 1,
        step.state
      );
      
      childNode.evaluation = await this.evaluateThought(childNode, node);
      childNode.confidence = this.calculateConfidence(childNode.evaluation);

      // Prune low-confidence branches early (threshold 0.4)
      if (childNode.confidence > 0.4) {
        this.thoughtTree.set(childNode.id, childNode);
        node.children.push(childNode.id);

        if (childNode.confidence > 0.6 && node.depth < this.maxDepth - 1) {
          await this.expandTree(childNode);
        }
      }
    }
  }

  private async generateNextSteps(
    node: ThoughtNode, 
    count: number
  ): Promise<Array<{ content: string; state: any }>> {
    const prompt = `
Given the current reasoning step: "${node.content}"
And the current state: ${JSON.stringify(node.state || {}, null, 2)}

Generate ${count} different possible next logical steps to solve the problem.
Each step should:
1. Build upon the previous reasoning
2. Explore a different approach or angle
3. Move closer to a solution

Return ONLY a valid JSON array of objects with this structure: [{ "content": "next step description", "state": "optional string describing new state" }]
    `.trim();

    const response = await this.invokeGemini(prompt, "You are a logical reasoning engine.");
    return this.parseLLMResponse(response || "[]");
  }

  private async evaluateThought(
    node: ThoughtNode,
    parent: ThoughtNode
  ): Promise<ThoughtNode['evaluation']> {
    const prompt = `
Evaluate this reasoning step:
Previous: "${parent.content}"
Current: "${node.content}"

Rate from 0.0 to 1.0 on:
1. Correctness: Is this logically sound?
2. Completeness: Does it address all aspects?
3. Coherence: Does it flow from the previous step?

Return ONLY a valid JSON object: { "correctness": 0.8, "completeness": 0.7, "coherence": 0.9 }
    `.trim();

    const response = await this.invokeGemini(prompt, "You are a critical evaluator.");
    return this.parseEvaluation(response || "{}");
  }

  private calculateConfidence(evaluation: ThoughtNode['evaluation']): number {
    const weights = { correctness: 0.5, completeness: 0.3, coherence: 0.2 };
    return (
      (evaluation.correctness || 0) * weights.correctness +
      (evaluation.completeness || 0) * weights.completeness +
      (evaluation.coherence || 0) * weights.coherence
    );
  }

  private extractAllPaths(): ThoughtNode[][] {
    const paths: ThoughtNode[][] = [];
    const root = Array.from(this.thoughtTree.values())[0];
    if (!root) return [];

    const dfs = (node: ThoughtNode, currentPath: ThoughtNode[]) => {
      currentPath.push(node);
      if (node.children.length === 0) {
        paths.push([...currentPath]);
      } else {
        for (const childId of node.children) {
          const child = this.thoughtTree.get(childId);
          if (child) dfs(child, currentPath);
        }
      }
      currentPath.pop();
    };

    dfs(root, []);
    return paths;
  }

  private async evaluatePath(path: ThoughtNode[]): Promise<ReasoningPath> {
    const avgConfidence = path.reduce((sum, node) => sum + node.confidence, 0) / path.length;
    const reasoning = path.map(node => node.content);
    const finalAnswer = await this.synthesizeFinalAnswer(path);

    return {
      nodes: path,
      totalConfidence: avgConfidence,
      reasoning,
      finalAnswer
    };
  }

  private async synthesizeFinalAnswer(path: ThoughtNode[]): Promise<string> {
    const reasoningChain = path.map((node, i) => `Step ${i + 1}: ${node.content}`).join('\n');
    const prompt = `
Given this chain of reasoning:
${reasoningChain}

Provide a clear, concise final answer that synthesizes all steps into a solution.
    `.trim();

    return (await this.invokeGemini(prompt, "You are a synthesizer of truth.")) || "Synthesis failed.";
  }

  private createThoughtNode(content: string, parentId: string | null, depth: number, state: any): ThoughtNode {
    return {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      state: state || {},
      confidence: 0,
      depth,
      parent: parentId,
      children: [],
      evaluation: { correctness: 0, completeness: 0, coherence: 0 }
    };
  }

  private parseLLMResponse(response: string): any[] {
    try {
      // Clean up potential markdown code blocks
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      console.warn("Failed to parse TreeOfThought response:", response);
      return [];
    }
  }

  private parseEvaluation(response: string): ThoughtNode['evaluation'] {
    try {
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return { correctness: 0.5, completeness: 0.5, coherence: 0.5 };
    }
  }
}

// ============================================================
// 2. SELF-REFLECTIVE AGENT
// ============================================================

export class SelfReflectiveAgent {
  private maxIterations: number;
  private confidenceThreshold: number;
  private invokeGemini: LLMCaller;

  constructor(invokeGemini: LLMCaller, maxIterations = 2, confidenceThreshold = 0.85) {
    this.maxIterations = maxIterations;
    this.confidenceThreshold = confidenceThreshold;
    this.invokeGemini = invokeGemini;
  }

  async generateWithReflection(query: string, context?: any): Promise<ReflectionResult> {
    let response = await this.generateInitialResponse(query, context);
    let confidence = 0;
    let iterations = 0;
    let lastCritique: any = { strengths: [], weaknesses: [], errors: [], improvements: [] };

    while (confidence < this.confidenceThreshold && iterations < this.maxIterations) {
      iterations++;
      console.log(`🔄 Reflection iteration ${iterations}`);

      lastCritique = await this.critiqueSelf(response, query);
      confidence = this.assessConfidenceSimple(lastCritique);

      if (confidence < this.confidenceThreshold) {
        response = await this.improveResponse(response, lastCritique, query);
      }
    }

    return {
      originalResponse: response, // Technically the final one
      critique: lastCritique,
      improvedResponse: response,
      confidence,
      iterations
    };
  }

  private async generateInitialResponse(query: string, context?: any): Promise<string> {
    const prompt = `Query: ${query}\n${context ? `Context: ${JSON.stringify(context)}` : ''}\nProvide a comprehensive, well-reasoned response.`;
    return (await this.invokeGemini(prompt, "You are a helpful assistant.")) || "No response.";
  }

  private async critiqueSelf(response: string, query: string): Promise<ReflectionResult['critique']> {
    const prompt = `
Original query: ${query}
Response to critique: ${response}

Analyze this response critically:
1. Strengths?
2. Weaknesses?
3. Logical errors?
4. Specific improvements?

Return ONLY valid JSON: { "strengths": [], "weaknesses": [], "errors": [], "improvements": [] }
    `.trim();
    const result = await this.invokeGemini(prompt, "You are a harsh critic.");
    return this.parseCritique(result || "{}");
  }

  private assessConfidenceSimple(critique: ReflectionResult['critique']): number {
    // Simple heuristic: fewer errors/weaknesses = higher confidence
    const errorPenalty = (critique.errors?.length || 0) * 0.2;
    const weakPenalty = (critique.weaknesses?.length || 0) * 0.1;
    return Math.max(0, 1.0 - errorPenalty - weakPenalty);
  }

  private async improveResponse(response: string, critique: ReflectionResult['critique'], query: string): Promise<string> {
    const prompt = `
Original query: ${query}
Current response: ${response}
Critique:
Errors: ${critique.errors.join(', ')}
Weaknesses: ${critique.weaknesses.join(', ')}
Improvements: ${critique.improvements.join(', ')}

Generate an improved response addressing these issues.
    `.trim();
    return (await this.invokeGemini(prompt, "You are an expert editor.")) || response;
  }

  private parseCritique(response: string): ReflectionResult['critique'] {
    try {
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return { strengths: [], weaknesses: [], errors: [], improvements: [] };
    }
  }
}

// ============================================================
// 3. CONTINUAL LEARNING SYSTEM
// ============================================================

export class ContinualLearningSystem {
  private invokeGemini: LLMCaller;

  constructor(invokeGemini: LLMCaller) {
    this.invokeGemini = invokeGemini;
  }

  async learnFromInteraction(interaction: Episode['interaction'], outcome: Episode['outcome']): Promise<void> {
    const episode: Episode = {
      id: `episode_${Date.now()}`,
      timestamp: Date.now(),
      interaction,
      outcome,
      patterns: []
    };

    const patterns = await this.extractPatterns(episode);
    episode.patterns = patterns;

    // Store in Dexie
    await driftDB.episodes.add(episode);
    
    for (const pattern of patterns) {
       // Simple upsert logic for patterns
       const existing = await driftDB.patterns.get(pattern.id);
       if (!existing) {
         await driftDB.patterns.add(pattern);
       }
    }

    console.log(`📚 Learned from interaction. Extracted ${patterns.length} patterns.`);
  }

  private async extractPatterns(episode: Episode): Promise<Pattern[]> {
    const prompt = `
Analyze this interaction:
Query: ${episode.interaction.query}
Response: ${episode.interaction.response.substring(0, 500)}...
Outcome: ${JSON.stringify(episode.outcome)}

Identify reusable patterns (strategies, knowledge, behaviors).
Return ONLY JSON array: [{ "type": "strategy|knowledge", "description": "...", "examples": [], "applicability": [] }]
    `.trim();

    const response = await this.invokeGemini(prompt, "You are a meta-learning system.");
    const rawPatterns = this.parsePatterns(response || "[]");
    
    return rawPatterns.map((p: any) => ({
        ...p,
        id: `pat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        successRate: episode.outcome.goalAchieved ? 1.0 : 0.5
    }));
  }

  private parsePatterns(response: string): any[] {
    try {
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  }

  async getRelevantPatterns(context: string): Promise<Pattern[]> {
     // Simple retrieval: get all and filter by simple keyword match (conceptually)
     // In a real vector DB, this would be semantic search.
     const allPatterns = await driftDB.patterns.toArray();
     // Mock relevance
     return allPatterns.slice(0, 3);
  }
}
