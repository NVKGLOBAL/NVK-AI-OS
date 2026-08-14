import React from 'react';
import CodexFooterBar from './core/CodexFooterBar';
import type { CodexModeId } from '../types';

interface FooterProps {
  phase: string;
  mode: string;
  status: string;
  currentEntropy: number;
  currentCodexModeId: CodexModeId;
  onApplyNVKAnchor: () => void;
}

export const Footer: React.FC<FooterProps> = (props) => {
  return <CodexFooterBar {...props} />;
};
