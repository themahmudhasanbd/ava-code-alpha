import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(cmd, args)
}

export function tauriListen<T>(event: string, handler: (payload: { payload: T }) => void): Promise<UnlistenFn> {
  return listen<T>(event, handler)
}

export interface ConnectArgs {
  serverUrl: string
  username?: string
  password?: string
}

export function connect(args: ConnectArgs): Promise<string> {
  return tauriInvoke('connect', { args })
}

export function disconnect(): Promise<void> {
  return tauriInvoke('disconnect')
}

export function healthCheck(): Promise<boolean> {
  return tauriInvoke('health_check')
}

export function reconnect(): Promise<boolean> {
  return tauriInvoke('reconnect')
}

export function sendRpc(method: string, params?: Record<string, unknown>): Promise<unknown> {
  return tauriInvoke('send_rpc', { method, params: params ?? {} })
}

export const EVENTS = {
  RPC_NOTIFICATION: 'rpc-notification',
  CONNECTION_STATUS: 'connection-status',
} as const
