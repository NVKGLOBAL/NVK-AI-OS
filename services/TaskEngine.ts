import { NVKTask } from '../types';
import { eventBus } from './EventBus';
import { capabilityRegistry } from './CapabilityRegistry';

class TaskEngine {
  private tasks: Map<string, NVKTask> = new Map();

  createTask(objective: string): NVKTask {
    const task: NVKTask = {
      id: `task-${Date.now()}`,
      objective,
      status: 'QUEUED',
      progress: 0,
      startTime: Date.now(),
      lastUpdate: Date.now()
    };
    this.tasks.set(task.id, task);
    eventBus.publish({ type: 'TASK_STARTED', taskId: task.id });
    return task;
  }

  async runCapability(taskId: string, capabilityId: string, input: any) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'RUNNING';
    task.currentAction = `Executing ${capabilityId}...`;
    task.lastUpdate = Date.now();
    
    try {
      const result = await capabilityRegistry.executeWithAudit(capabilityId, input, { cwd: '.', confirmedByUser: true });
      
      if (result.success) {
        task.status = 'COMPLETED';
        task.result = result.output;
        task.evidence = result.evidence;
        task.progress = 100;
        eventBus.publish({ type: 'TASK_COMPLETED', taskId: task.id });
      } else {
        task.status = 'FAILED';
        task.error = result.error;
        eventBus.publish({ type: 'TASK_FAILED', taskId: task.id, error: result.error || 'Unknown error' });
      }
    } catch (e: any) {
      task.status = 'FAILED';
      task.error = e.message;
      eventBus.publish({ type: 'TASK_FAILED', taskId: task.id, error: e.message });
    }
    
    task.lastUpdate = Date.now();
  }

  getTask(taskId: string): NVKTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): NVKTask[] {
    return Array.from(this.tasks.values());
  }
}

export const taskEngine = new TaskEngine();
