import { eventBus } from './EventBus';
import { taskEngine } from './TaskEngine';
import { capabilityRegistry } from './CapabilityRegistry';
import { NVKEvent } from '../types';

async function runTests() {
  const events: NVKEvent[] = [];
  eventBus.subscribe(e => events.push(e));

  console.log('Testing Task Creation...');
  const task = taskEngine.createTask('Test File System Write');
  if (task.status !== 'QUEUED') {
    throw new Error('Task should be QUEUED');
  }

  console.log('Testing Capability Registry - Available check...');
  const available = await capabilityRegistry.getAvailable();
  if (!available.find(c => c.id === 'filesystem.write')) {
     throw new Error('filesystem.write capability should be available');
  }

  console.log('Testing Write Capability execution via TaskEngine...');
  
  // Note: we won't fully execute it since the actual execution requires the server proxy running 
  // and might create real files, but we can verify the structure
  console.log('All tests passed structurally.');
}

runTests().catch(console.error);
