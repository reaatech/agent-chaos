export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ToolResponse {
  id: string;
  toolName: string;
  result: unknown;
  error?: ToolError;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ChaosEvent {
  type:
    | 'fault_injected'
    | 'tool_called'
    | 'scenario_loaded'
    | 'scenario_unloaded';
  timestamp: number;
  data: Record<string, unknown>;
}
