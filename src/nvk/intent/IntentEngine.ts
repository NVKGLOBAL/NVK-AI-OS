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
    // Ret12 fix: the old rule fired on ANY "what is ..." question, so a
    // general question ("what is the capital of France?") was routed to
    // the calculator and failed with "no arithmetic expression found".
    // A calculation now requires real arithmetic (number-operator-number)
    // AND a math framing or a bare expression — a date ("2026-11-23"), a
    // phone number ("555-1234") or a bare year is not a calculation.
    else if (
      (/^(what is|calculate|compute|how much is|solve)\b/.test(p) && /\d+\s*[\+\-\*\/]\s*\d+/.test(p)) ||
      (/^[\d\s+\-*/().?]+$/.test(p) && /\d+\s*[\+\-\*\/]\s*\d+/.test(p))
    ) {
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
    // Slice 7: the hardcoded Texas-solar rule is removed. The old rule
    // routed ANY research mentioning "commercial solar" OR "texas" OR
    // "pitch deck" to workflow_execution, which built a hardcoded Texas
    // solar + pitch deck plan — a fabricated plan for a general question.
    // Research goes to web_research; a pitch deck goes to
    // document_generation. There is no generic workflow engine, so no
    // input is routed to workflow_execution.
    else if (p.includes('research') || p.includes('find') || p.includes('search')) {
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
      // Slice 7: an unknown input produces `unknown`, not a fabricated
      // plan. The old catch-all turned ANY non-empty input into
      // run_task, and the Planner turned run_task into a web.search
      // plan — so a greeting or a question nobody understood got a
      // fabricated web search. Unknown means ask, never a guessed plan.
      intent = 'unknown';
      objective = prompt;
    }
    
    nvkEventBus.publish({ type: 'intent.detected', intent, prompt });
    return { intent, target, objective };
  }
}

export const intentEngine = new IntentEngine();
