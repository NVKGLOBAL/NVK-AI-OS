import type { AgentDecisionOutput, RiskItem } from '../types';

export function parseAgentDecision(raw: string, agentId: string): AgentDecisionOutput {
  const extract = (tag: string, defaultVal = '') => {
    const match = raw.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return match ? match[1].trim() : defaultVal;
  };

  const extractList = (tag: string): string[] => {
    const content = extract(tag);
    if (!content) return [];
    return content.split('|').map(s => s.trim()).filter(Boolean);
  };

  const extractRisks = (): RiskItem[] => {
    const risks: RiskItem[] = [];
    const regex = /<RISKS\s+severity="([^"]+)">([^|]+)\|\|([^<]+)<\/RISKS>/gi;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      risks.push({
        severity: match[1].toUpperCase() as any,
        label: match[2].trim(),
        mitigation: match[3].trim()
      });
    }
    return risks;
  };

  let summary = extract('SUMMARY');
  if (!summary) {
    // fallback if model failed to format
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    summary = lines.length > 0 ? lines[0].slice(0, 150) : 'No summary provided.';
  }

  return {
    agentId,
    timestamp: Date.now(),
    summary,
    confidence: parseInt(extract('CONFIDENCE', '50'), 10) || 50,
    recommendation: extract('RECOMMENDATION', 'No primary recommendation provided.'),
    alternatives: extractList('ALTERNATIVES'),
    risks: extractRisks(),
    requiredInputs: extractList('REQUIRED_INPUTS'),
    dataReferenced: [],
    exportReady: true,
    rawResponse: raw
  };
}
