const fs = require('fs');

let codex = fs.readFileSync('components/CodexOrbSystem.tsx', 'utf8');

// Wrap CodexOrbSystem in React.memo
if (!codex.includes('export const CodexOrbSystem = React.memo(')) {
  codex = codex.replace(
    'export const CodexOrbSystem: React.FC<CodexOrbSystemProps> = ({',
    'export const CodexOrbSystem = React.memo(({'
  );
  
  codex = codex.replace(
    /};?\s*$/g,
    '});'
  );
  // Need to be careful with the end of the file.
}
fs.writeFileSync('components/CodexOrbSystem.tsx', codex);
