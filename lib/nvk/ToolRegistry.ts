export interface NVKTool {
  id: string;
  name: string;
  description: string;
  commandTemplate: string;
  requiredPermissions: string[];
  requiresHITL: boolean;
}

export const NVK_TOOL_REGISTRY: Record<string, NVKTool> = {
  stableDiffusion: {
    id: 'stableDiffusion',
    name: 'Stable Diffusion (Local)',
    description: 'Generates images from text prompts using a local Stable Diffusion installation.',
    commandTemplate: 'python sd_cli.py --prompt "{{prompt}}" --output "{{outputPath}}"',
    requiredPermissions: ['fs:write', 'shell:execute'],
    requiresHITL: true,
  },
  whisper: {
    id: 'whisper',
    name: 'Whisper (Local Transcription)',
    description: 'Transcribes audio files to text using local Whisper.',
    commandTemplate: 'whisper "{{filePath}}" --model base',
    requiredPermissions: ['fs:read', 'shell:execute'],
    requiresHITL: false,
  },
  browserAutomation: {
    id: 'browserAutomation',
    name: 'Browser Automation (Playwright)',
    description: 'Automates browser actions like navigating, filling forms, and taking screenshots.',
    commandTemplate: 'node playwright_script.js --action "{{action}}" --url "{{url}}" --data "{{data}}"',
    requiredPermissions: ['network:access', 'shell:execute'],
    requiresHITL: true,
  },
  facebookCli: {
    id: 'facebookCli',
    name: 'Facebook CLI',
    description: 'Posts content to Facebook via a local CLI tool.',
    commandTemplate: 'fb-cli post --image "{{imagePath}}" --message "{{message}}"',
    requiredPermissions: ['network:access', 'shell:execute'],
    requiresHITL: true,
  },
  checkDependencies: {
    id: 'checkDependencies',
    name: 'Dependency Checker',
    description: 'Checks if required CLI tools are installed on the host OS.',
    commandTemplate: 'which {{toolName}}',
    requiredPermissions: ['shell:execute'],
    requiresHITL: false,
  },
  systemDiagnostics: {
    id: 'systemDiagnostics',
    name: 'System Diagnostics',
    description: 'Runs a comprehensive diagnostic on the host OS, checking CPU, RAM, and GPU status.',
    commandTemplate: 'top -n 1 && nvidia-smi',
    requiredPermissions: ['shell:execute'],
    requiresHITL: false,
  },
  launchApp: {
    id: 'launchApp',
    name: 'Launch Application',
    description: 'Launches a specific application on the host OS.',
    commandTemplate: 'open -a "{{appName}}" || start "" "{{appName}}"',
    requiredPermissions: ['shell:execute'],
    requiresHITL: true,
  },
  manageFiles: {
    id: 'manageFiles',
    name: 'File Manager',
    description: 'Performs file operations like move, copy, or delete.',
    commandTemplate: '{{operation}} "{{source}}" "{{destination}}"',
    requiredPermissions: ['fs:read', 'fs:write', 'shell:execute'],
    requiresHITL: true,
  },
  screenCapture: {
    id: 'screenCapture',
    name: 'Screen Capture',
    description: 'Captures a screenshot of the current workspace for visual analysis.',
    commandTemplate: 'screencapture -x "{{outputPath}}" || import -window root "{{outputPath}}"',
    requiredPermissions: ['fs:write', 'shell:execute'],
    requiresHITL: false,
  }
};
