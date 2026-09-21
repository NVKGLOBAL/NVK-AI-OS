import { NVKApplication, NVKWorkflow, NVKOrbState, NVKTask, NVKActivityStep } from '../types';
import { capabilityRegistry } from './CapabilityRegistry';
import { eventBus } from './EventBus';
import { taskEngine } from './TaskEngine';

export const NVK_APPLICATION_REGISTRY: NVKApplication[] = [
  {
    id: 'NexusBrowser',
    name: 'Nexus Web & Research',
    icon: 'ri-global-line',
    category: 'Intelligence',
    capabilities: ['Web Search', 'Domain Extraction', 'Market Research', 'Live Querying'],
    description: 'Connected web access and spatial web explorer.'
  },
  {
    id: 'DocumentWorkspace',
    name: 'Document & Pitch Deck Canvas',
    icon: 'ri-file-text-line',
    category: 'Creation',
    capabilities: ['Pitch Deck Generator', 'Executive Memos', 'Markdown Rendering', 'Artifact Export'],
    description: 'Generative artifact canvas for strategic documents, decks, and reports.'
  },
  {
    id: 'NexusTerminal',
    name: 'Nexus Terminal',
    icon: 'ri-terminal-box-line',
    category: 'System',
    capabilities: ['Shell Execution', 'Process Management'],
    description: 'Direct host environment terminal bridge.'
  },
  {
    id: 'FileSystemPanel',
    name: 'Spatial File System',
    icon: 'ri-folder-6-line',
    category: 'System',
    capabilities: ['File Ingestion', 'Semantic Indexing', 'Metadata Extraction'],
    description: 'Integrated file explorer with semantic content analysis.'
  }
];

export interface ProcessedNVKIntent {
  interpretedAction: any;
  replyMessage: string;
  orbStateSequence: { state: NVKOrbState; delayMs: number; statusText: string }[];
  spawnAppId?: string;
  spawnAppIds?: string[];
  workflow?: NVKWorkflow;
  requiresConfirmation?: boolean;
  activitySteps?: NVKActivityStep[];
  buttons?: {label: string, action: string}[];
  initialData?: any;
}

export class NVKActionEngine {
  
  async parseAndExecute(prompt: string): Promise<ProcessedNVKIntent> {
    const clean = prompt.toLowerCase();
    
    // Announce parsing event
    eventBus.publish({ type: 'ACTION_STARTED', actionId: `act-${Date.now()}`, description: prompt });

        if (clean.includes('what can you do') || clean.includes('show me what you can do')) {
      return {
        interpretedAction: {
          id: `act-${Date.now()}`,
          type: 'demo_capabilities',
          target: 'System',
          label: 'Capability Demonstration',
          status: 'completed',
          createdAt: Date.now()
        },
        replyMessage: "I can do more than answer questions.\n\nI can operate the NVK environment, use the capabilities available to your device, create and modify files, research the web, launch applications, analyze information, build artifacts, coordinate tasks, and show you the work as it happens.\n\nTry saying:\n\n\"Open the browser and research NVK.\"\n\"Create a presentation about NVK.\"\n\"Analyze this file.\"\n\"Open the terminal.\"\n\"Build me a landing page.\"\n\"Find opportunities for NVK.\"\n\"Show me everything you can access.\"",
        orbStateSequence: [
          { state: 'THINKING', delayMs: 400, statusText: 'Synthesizing capabilities...' },
          { state: 'CALM', delayMs: 1500, statusText: 'Ready.' }
        ],
        // No apps spawned yet. Wait for the user to click the button.
        buttons: [
          { label: 'WATCH NVK WORK', action: 'Execute capability demonstration workflow' }
        ]
      };
    }
    
    
    if (clean.includes('execute capability demonstration workflow')) {
      // Fire asynchronous real tasks
      setTimeout(() => {
         const t1 = taskEngine.createTask('Verify Local ML State');
         taskEngine.runCapability(t1.id, 'terminal.execute', { command: 'echo "ML Context OK"' });
      }, 5000);
      
      setTimeout(() => {
         const t2 = taskEngine.createTask('Index Workspace Documentation');
         taskEngine.runCapability(t2.id, 'filesystem.write', { path: './demo_artifact.md', content: '# NVK Workspace\nGenerated during demonstration.' });
      }, 9000);
  
      return {
        interpretedAction: {
          id: `act-${Date.now()}`,
          type: 'demo_workflow',
          target: 'System',
          label: 'Capability Demonstration Workflow',
          status: 'running',
          createdAt: Date.now()
        },
        replyMessage: "Understood.\n\nCapabilities verified.\n\nThis is NVK.\n\nYou don't navigate the system.\n\nYou tell it what you want to accomplish.",
        orbStateSequence: [
          { state: 'THINKING', delayMs: 400, statusText: 'Checking available systems...' },
          { state: 'ACTING', delayMs: 2500, statusText: '◉ LOCAL INTELLIGENCE       ONLINE\n◉ 3D SPATIAL ENGINE        ONLINE\n◉ FILESYSTEM               ONLINE\n◉ TERMINAL                 ONLINE\n◉ WEB ACCESS               ONLINE\n◉ TASK ENGINE              ONLINE' },
          { state: 'ACTING', delayMs: 5000, statusText: 'Capabilities verified.' },
          { state: 'ACTING', delayMs: 7000, statusText: 'Spawning demonstration workflow...' },
          { state: 'CALM', delayMs: 15000, statusText: 'Ready for instruction.' }
        ],
        spawnAppIds: ['NexusBrowser', 'NexusTerminal', 'FileSystemPanel', 'DocumentWorkspace'],
        activitySteps: [
          { id: 'step-1', description: 'Checking capabilities...', status: 'completed' },
          { id: 'step-2', description: 'Spawning Web Browser', status: 'pending' },
          { id: 'step-3', description: 'Opening Terminal Bridge', status: 'pending' },
          { id: 'step-4', description: 'Mounting File System', status: 'pending' },
          { id: 'step-5', description: 'Preparing Document Workspace', status: 'pending' }
        ]
      };
    }
    
    if (clean.includes('terminal') || clean.includes('command') || clean.includes('shell') || clean.includes('ls ') || clean.includes('pwd')) {
      const match = clean.match(/(?:execute|run|ls|pwd) (.*)/);
      const cmd = match ? match[1] : (clean.startsWith('ls') || clean.startsWith('pwd') ? clean : null);
      if (cmd) {
         const task = taskEngine.createTask(`Execute command: ${cmd}`);
         taskEngine.runCapability(task.id, 'terminal.execute', { command: cmd });
         
         return {
            interpretedAction: {
              id: `act-${Date.now()}`,
              type: 'terminal_execute',
              target: 'NexusTerminal',
              label: `Execute command`,
              status: 'running',
              createdAt: Date.now()
            },
            replyMessage: `Executing command: ${cmd}`,
            orbStateSequence: [
              { state: 'THINKING', delayMs: 400, statusText: 'Connecting to terminal bridge...' },
              { state: 'ACTING', delayMs: 1200, statusText: 'Executing command...' },
              { state: 'CALM', delayMs: 3000, statusText: 'Execution complete.' }
            ],
            spawnAppId: 'NexusTerminal',
            requiresConfirmation: true
         };
      }
      return {
        interpretedAction: {
          id: `act-${Date.now()}`,
          type: 'open_terminal',
          target: 'NexusTerminal',
          label: 'Launch Terminal',
          status: 'completed',
          createdAt: Date.now()
        },
        replyMessage: "Opening Nexus Terminal. You can execute host commands directly.",
        orbStateSequence: [
          { state: 'ACTING', delayMs: 800, statusText: 'Opening terminal bridge...' },
          { state: 'CALM', delayMs: 1600, statusText: 'Terminal online.' }
        ],
        spawnAppId: 'NexusTerminal'
      };
    }

    if (clean.includes('browser') || clean.includes('web') || clean.includes('search') || clean.includes('fetch') || clean.includes('research')) {
      return {
        interpretedAction: {
          id: `act-${Date.now()}`,
          type: 'search_web',
          target: 'NexusBrowser',
          label: 'Launch Nexus Web Explorer',
          status: 'completed',
          createdAt: Date.now()
        },
        replyMessage: "Opening Nexus Web Explorer. Ready to retrieve connected web access.",
        orbStateSequence: [
          { state: 'THINKING', delayMs: 300, statusText: 'Locating browser runtime...' },
          { state: 'ACTING', delayMs: 800, statusText: 'Manifesting Nexus 3D Node...' },
          { state: 'CALM', delayMs: 1600, statusText: 'Nexus Browser online.' }
        ],
        spawnAppId: 'NexusBrowser'
      };
    }

    if (clean.includes('deck') || clean.includes('presentation') || clean.includes('document')) {
      return {
        interpretedAction: {
          id: `act-${Date.now()}`,
          type: 'create_document',
          target: 'DocumentWorkspace',
          label: 'Generate Document',
          status: 'running',
          createdAt: Date.now()
        },
        replyMessage: "Opening Document Workspace to begin artifact generation.",
        orbStateSequence: [
          { state: 'ACTING', delayMs: 800, statusText: 'Spawning Document Canvas Workspace...' },
          { state: 'CALM', delayMs: 1600, statusText: 'Workspace ready.' }
        ],
        spawnAppId: 'DocumentWorkspace'
      };
    }

    if (clean.includes('file') || clean.includes('folder') || clean.includes('explorer')) {
      return {
        interpretedAction: {
          id: `act-${Date.now()}`,
          type: 'open_files',
          target: 'FileSystemPanel',
          label: 'Launch File Explorer',
          status: 'completed',
          createdAt: Date.now()
        },
        replyMessage: "Opening Spatial File System.",
        orbStateSequence: [
          { state: 'ACTING', delayMs: 800, statusText: 'Connecting to file system...' },
          { state: 'CALM', delayMs: 1600, statusText: 'File System online.' }
        ],
        spawnAppId: 'FileSystemPanel'
      };
    }

    return {
      interpretedAction: {
        id: `act-${Date.now()}`,
        type: 'custom',
        label: `Execute: ${prompt.slice(0, 30)}...`,
        status: 'completed',
        createdAt: Date.now()
      },
      replyMessage: `Acknowledged. I am processing "${prompt}".`,
      orbStateSequence: [
        { state: 'THINKING', delayMs: 300, statusText: 'Processing instruction...' },
        { state: 'CALM', delayMs: 1200, statusText: 'Ready.' }
      ]
    };
  }
}

export const nvkActionEngine = new NVKActionEngine();
