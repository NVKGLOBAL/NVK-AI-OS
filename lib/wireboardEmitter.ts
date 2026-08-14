import type { WireboardConnection } from '../types';

interface EmittedEvent {
  connectionId: string;
  payload: any;
  timestamp: number;
}

class CircularBuffer<T> {
  private buffer: T[];
  private pointer: number;
  private size: number;
  
  constructor(size: number) {
    this.buffer = new Array<T>(size);
    this.pointer = 0;
    this.size = size;
  }
  
  add(item: T) {
    if (this.size === 0) return;
    this.buffer[this.pointer] = item;
    this.pointer = (this.pointer + 1) % this.size;
  }
  
  get(fromIndex?: number): T[] {
    const valid = this.buffer.filter(Boolean);
    // Sort chronologically (oldest to newest)
    valid.sort((a: any, b: any) => a.timestamp - b.timestamp);
    if (fromIndex !== undefined) {
      return valid.slice(fromIndex);
    }
    return valid;
  }
}

class WireboardEmitterEngine {
  private buffers: Map<string, CircularBuffer<EmittedEvent>> = new Map();

  emit(connection: WireboardConnection, payload: any) {
    // Validate payload against connection schema
    const schema = connection.schema;
    if (schema && schema.fields) {
       for (const field of schema.fields) {
         if (field.required && payload[field.key] === undefined) {
           console.warn(`[Wireboard] Validation failed for connection ${connection.id}: Missing required field ${field.key}`);
           connection.errorCount++;
           connection.healthStatus = 'BROKEN';
           return false;
         }
       }
    }

    if (!this.buffers.has(connection.id)) {
      this.buffers.set(connection.id, new CircularBuffer(connection.replayBufferSize || 0));
    }

    // In a real implementation this would publish via a pub/sub mechanism
    // such as a Subject from RxJS, or a native EventTarget.
    const event = { connectionId: connection.id, payload, timestamp: Date.now() };
    this.buffers.get(connection.id)!.add(event);

    connection.lastEmittedAt = new Date();
    connection.healthStatus = 'HEALTHY';
    connection.errorCount = 0;
    return true;
  }

  requestReplay(connectionId: string, fromIndex?: number): EmittedEvent[] {
    if (!this.buffers.has(connectionId)) return [];
    return this.buffers.get(connectionId)!.get(fromIndex);
  }
}

export const wireboardEmitter = new WireboardEmitterEngine();
