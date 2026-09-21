import { NVKEvent } from './NVKEventTypes';

type EventListener = (event: NVKEvent) => void;

class NVKEventBus {
  private listeners: EventListener[] = [];

  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  publish(event: NVKEvent) {
    console.log('[NVK EVENT]', event.type, event);
    this.listeners.forEach(listener => listener(event));
  }
}

export const nvkEventBus = new NVKEventBus();
