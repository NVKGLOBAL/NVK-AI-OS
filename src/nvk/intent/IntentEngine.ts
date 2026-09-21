import { nvkEventBus } from '../events/NVKEventBus';

export type Intent =
  | "capability_discovery"
  | "open_application"
  | "run_task"
  | "calculation"
  | "image_generation"
  | "email_dispatch"
  | "messaging"
  | "software_generation"
  | "web_research"
  | "document_generation"
  | "workflow_execution"
  | "conversation"
  | "unknown";

export interface ParsedIntent {
  intent: Intent;
  target?: string;
  objective?: string;
}

export class IntentEngine {
  classify(prompt: string): ParsedIntent {
    const p = prompt.toLowerCase().trim();
    let intent: Intent = 'unknown';
    let target: string | undefined = undefined;
    let objective: string | undefined = undefined;

    // 1. Conversation (e.g. "hello", "how are you")
    if (['hi', 'hello', 'hey', 'greetings', 'how are you', 'sup'].includes(p) || p.startsWith('hello') || p.startsWith('hi ')) {
      intent = 'conversation';
      objective = prompt;
    }
    // 2. Capability Discovery
    else if (p === 'show me what you can do' || p.includes('what can you do') || p.includes('capability matrix')) {
      intent = 'capability_discovery';
    } 
    // 3. Calculation (e.g. "5 + 5", "9 - 59", "what is 20 * 4")
    else if (/^(what is |calculate |\d+[\s\+\-\*\/\d]+)/.test(p) || /\b\d+\s*[\+\-\*\/]\s*\d+\b/.test(p)) {
      intent = 'calculation';
      objective = prompt;
    } 
    // 4. Image Generation (e.g. "Create a picture of a dog")
    else if (p.includes('picture') || p.includes('image') || p.includes('photo of') || p.includes('draw')) {
      intent = 'image_generation';
      objective = prompt;
    } 
    // 5. Application Launch (e.g. "open spotify")
    else if (p === 'open an application' || p === 'open app' || p === 'open application') {
      intent = 'open_application';
      target = undefined;
    } else if (p.startsWith('open ')) {
      intent = 'open_application';
      target = prompt.substring(5).trim();
    } 
    // 6. Email Dispatch (e.g. "send an email")
    else if (p.includes('email') || p.includes('send mail')) {
      intent = 'email_dispatch';
      objective = prompt;
    } 
    // 7. Messaging
    else if (p.includes('text ') || p.includes('message ') || p.includes('whatsapp')) {
      intent = 'messaging';
      objective = prompt;
    } 
    // 8. Software Generation (e.g. "Make a chess game")
    else if (p.includes('chess game') || p.includes('build an app') || p.includes('make a game') || p.includes('write code')) {
      intent = 'software_generation';
      objective = prompt;
    } 
    // 9. Workflows & Research
    else if (p.includes('research') && (p.includes('commercial solar') || p.includes('texas') || p.includes('pitch deck'))) {
      intent = 'workflow_execution';
      objective = prompt;
    } else if (p.includes('research') || p.includes('find') || p.includes('search')) {
      intent = 'web_research';
      objective = prompt;
    } else if (p.includes('pitch deck') || p.includes('presentation') || p.includes('document')) {
      intent = 'document_generation';
      objective = prompt;
    } else if (p === 'start a task' || p === 'run task' || p === 'start task') {
      intent = 'run_task';
      objective = undefined;
    } else if (p.startsWith('start task ') || p.startsWith('run task ')) {
      intent = 'run_task';
      objective = prompt.replace(/^(start|run) task\s*/i, '').trim();
    } else {
      if (p.length > 0) {
        intent = 'run_task';
        objective = prompt;
      }
    }
    
    nvkEventBus.publish({ type: 'intent.detected', intent, prompt });
    return { intent, target, objective };
  }
}

export const intentEngine = new IntentEngine();
