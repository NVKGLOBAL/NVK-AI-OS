import React, { useState, useRef, useEffect } from 'react';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

interface NexusTerminalProps {
  addThought?: (text: string) => void;
  spawnSubAgent?: (name: string, task: string, color: string) => void;
}

const NexusTerminal: React.FC<NexusTerminalProps> = ({ addThought, spawnSubAgent }) => {
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: 'system', text: 'Angelic OS Nexus Terminal v1.0.0' },
    { type: 'system', text: 'Initializing secure NVK environment...' },
    { type: 'system', text: 'Type "help" for a list of available commands.' }
  ]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHitlEnabled, setIsHitlEnabled] = useState(true);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeShellCommand = async (cmd: string) => {
    let output: TerminalLine | null = null;
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      output = { type: data.isError ? 'error' : 'output', text: data.output || 'Command executed with no output.' };
    } catch (error: any) {
      output = { type: 'error', text: `Execution failed: ${error.message}` };
    }
    setHistory(prev => [...prev, output!]);
  };

  const handleApprove = async () => {
    if (!pendingCommand) return;
    const cmd = pendingCommand;
    setPendingCommand(null);
    await executeShellCommand(cmd);
  };

  const handleReject = () => {
    if (!pendingCommand) return;
    setHistory(prev => [...prev, { type: 'error', text: `[HITL] Execution of '${pendingCommand}' rejected by operator.` }]);
    setPendingCommand(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < commandHistory.length) {
          setHistoryIndex(nextIndex);
          setInput(commandHistory[commandHistory.length - 1 - nextIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    if (addThought) {
      addThought(`Executing: ${trimmed}`);
    }

    const newHistory: TerminalLine[] = [...history, { type: 'input', text: `PS C:\\ANGELIC_OS\\NEXUS> ${trimmed}` }];
    setHistory(newHistory);
    setInput('');
    
    let output: TerminalLine | null = null;
    const args = trimmed.split(' ');
    const command = args[0].toLowerCase();

    // Special check for npm install -g
    if (command === 'npm' && args.includes('install') && args.includes('-g')) {
      setHistory(prev => [...prev, { 
        type: 'error', 
        text: '[Angelic OS Safeguard] Global installations (-g) are restricted in this cloud environment. Please use "npx" to run CLI tools directly, or install locally without the -g flag.' 
      }]);
      setInput('');
      return;
    }

    switch (command) {
      case 'help':
        output = { type: 'output', text: 'Available commands:\n  help      - Show this help message\n  clear     - Clear the terminal history\n  status    - Show system status\n  ping      - Test connection latency\n  agent     - Control sub-agents\n  spawn     - Spawn a new sub-agent\n  connect   - Connect to a provider\n  analyze   - Run data analysis\n  browse    - Use the browser agent\n  ls        - List directory contents (Shell)\n  pwd       - Show current directory (Shell)\n  Any other command will be executed in the system shell.' };
        setHistory(prev => [...prev, output!]);
        break;
      case 'ls':
      case 'dir':
        await executeShellCommand('ls -F');
        break;
      case 'pwd':
        await executeShellCommand('pwd');
        break;
      case 'browse':
        if (args.length < 2) {
          output = { type: 'error', text: 'Usage: browse [url]' };
          setHistory(prev => [...prev, output!]);
        } else {
          const url = args[1];
          setHistory(prev => [...prev, { type: 'system', text: `[Browser Agent] Navigating to ${url}...` }]);
          try {
            const response = await fetch('/api/browse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, action: 'extract' })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            output = { type: data.isError ? 'error' : 'output', text: data.output || 'No content extracted.' };
          } catch (error: any) {
            output = { type: 'error', text: `Browser Agent failed: ${error.message}` };
          }
          setHistory(prev => [...prev, output!]);
        }
        break;
      case 'clear':
      case 'cls':
        setHistory([]);
        return;
      case 'status':
        output = { type: 'output', text: 'System Nominal. All angelic protocols active. Entropy: 0.04δ. Logic Core: Stable.' };
        setHistory(prev => [...prev, output!]);
        break;
      case 'ping':
        output = { type: 'output', text: 'Pong. Latency: 24ms. Connection secure.' };
        setHistory(prev => [...prev, output!]);
        break;
      case 'spawn':
        if (args.length < 4) {
          output = { type: 'error', text: 'Usage: spawn [name] [color] [task...]\nExample: spawn Scraper #ff0000 Extracting data' };
          setHistory(prev => [...prev, output!]);
        } else {
          const name = args[1];
          const color = args[2];
          const task = args.slice(3).join(' ');
          if (spawnSubAgent) {
            spawnSubAgent(name, task, color);
            output = { type: 'system', text: `[Sub-Agent] Spawned ${name} (${color}) for task: ${task}` };
          } else {
            output = { type: 'error', text: 'Sub-agent spawning is not available.' };
          }
          setHistory(prev => [...prev, output!]);
        }
        break;
      case 'agent':
        if (args.length < 3) {
          output = { type: 'error', text: 'Usage: agent [name] [action] [args...]\nExample: agent browser extract https://example.com' };
          setHistory(prev => [...prev, output!]);
        } else {
          const agentName = args[1].toLowerCase();
          const agentAction = args[2].toLowerCase();
          
          if (agentName === 'browser') {
            const url = args[3];
            if (!url) {
              output = { type: 'error', text: 'Usage: agent browser [extract|click|type] [url] [selector] [text]' };
              setHistory(prev => [...prev, output!]);
              break;
            }
            
            const selector = args[4];
            const textToType = args.slice(5).join(' ');
            
            setHistory(prev => [...prev, { type: 'system', text: `[Browser Agent] Executing '${agentAction}' on ${url}...` }]);
            
            try {
              const response = await fetch('/api/browse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, action: agentAction, selector, text: textToType })
              });
              
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              
              const data = await response.json();
              output = { type: data.isError ? 'error' : 'output', text: data.output || 'Action completed with no output.' };
            } catch (error: any) {
              output = { type: 'error', text: `Browser Agent failed: ${error.message}` };
            }
          } else {
            output = { type: 'output', text: `Agent '${agentName}' executed action: ${args.slice(2).join(' ')}` };
          }
          setHistory(prev => [...prev, output!]);
        }
        break;
      case 'connect':
        if (args.length < 2) {
          output = { type: 'error', text: 'Usage: connect [provider]' };
        } else {
          output = { type: 'output', text: `Establishing secure connection to ${args[1]}... Success.` };
        }
        setHistory(prev => [...prev, output!]);
        break;
      case 'analyze':
        output = { type: 'output', text: `Analyzing data stream... Pattern recognized. Confidence: 94.2%.` };
        setHistory(prev => [...prev, output!]);
        break;
      default:
        // Execute real terminal command
        if (isHitlEnabled) {
          setPendingCommand(trimmed);
        } else {
          await executeShellCommand(trimmed);
        }
        break;
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 p-3 sm:p-6 flex flex-col overflow-hidden border border-slate-800 rounded-xl relative font-mono">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0,transparent_70%)] pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-4 z-10 border-b border-slate-800 pb-2 sm:pb-4 gap-2 sm:gap-0">
        <h2 className="text-lg sm:text-xl text-emerald-400 flex items-center gap-2 sm:gap-3">
          <i className="ri-terminal-box-line"></i>
          Nexus Terminal
        </h2>
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-slate-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-slate-800">
            <span className="text-[8px] sm:text-[10px] text-slate-400 font-mono tracking-wider">HITL SAFEGUARD</span>
            <button 
              onClick={() => setIsHitlEnabled(!isHitlEnabled)}
              className={`relative inline-flex h-3 sm:h-4 w-6 sm:w-8 items-center rounded-full transition-colors ${isHitlEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-1.5 sm:h-2 w-1.5 sm:w-2 transform rounded-full bg-white transition-transform ${isHitlEnabled ? 'translate-x-3 sm:translate-x-4' : 'translate-x-0.5 sm:translate-x-1'}`} />
            </button>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 sm:h-2 w-1.5 sm:w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] sm:text-xs text-emerald-500 uppercase tracking-wider">Root Access</span>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto z-10 pr-2 custom-scrollbar text-sm space-y-2 mb-4 whitespace-pre-wrap">
        {history.map((line, idx) => (
          <div key={idx} className={`
            ${line.type === 'input' ? 'text-slate-300' : ''}
            ${line.type === 'output' ? 'text-emerald-300' : ''}
            ${line.type === 'error' ? 'text-rose-400' : ''}
            ${line.type === 'system' ? 'text-slate-500' : ''}
          `}>
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {pendingCommand ? (
        <div className="z-10 mt-2 p-4 border border-amber-500/30 bg-amber-950/20 rounded-lg text-amber-200 text-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-400">
            <i className="ri-error-warning-line text-lg"></i>
            <span className="font-bold tracking-widest uppercase text-xs">Authorization Required</span>
          </div>
          <p className="text-slate-300 text-xs">The system is attempting to execute a shell command:</p>
          <code className="bg-black/50 p-2 rounded text-emerald-400 font-mono text-xs border border-slate-800">{pendingCommand}</code>
          <div className="flex gap-3 mt-1">
            <button onClick={handleApprove} className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold transition-colors uppercase tracking-wider">Approve</button>
            <button onClick={handleReject} className="px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30 rounded text-xs font-bold transition-colors uppercase tracking-wider">Reject</button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleCommand} className="z-10 flex items-center gap-2 border-t border-slate-800 pt-4">
        <span className="text-emerald-500 font-bold">PS C:\ANGELIC_OS\NEXUS&gt;</span>
        <input 
          ref={inputRef}
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow bg-transparent border-none outline-none text-slate-300 placeholder-slate-700"
          placeholder="Enter command..."
          autoFocus
        />
      </form>
      )}
    </div>
  );
};

export default NexusTerminal;
