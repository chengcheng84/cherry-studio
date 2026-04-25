import { loggerService } from '@logger'
import { BaseService, Injectable, Phase, ServicePhase } from '@main/core/lifecycle'
import { IpcChannel } from '@shared/IpcChannel'
import { BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import * as os from 'os'

const logger = loggerService.withContext('TerminalService')

export interface TerminalSession {
  id: string
  pty: pty.IPty
  cols: number
  rows: number
}

@Injectable('TerminalService')
@ServicePhase(Phase.WhenReady)
export class TerminalService extends BaseService {
  private sessions: Map<string, TerminalSession> = new Map()

  constructor() {
    super()
  }

  protected async onInit(): Promise<void> {
    logger.info('TerminalService starting...')
    this.registerIpcHandlers()
  }

  protected async onStop(): Promise<void> {
    logger.info('TerminalService stopping...')
    this.disposeAllSessions()
  }

  private registerIpcHandlers(): void {
    this.ipcHandle(IpcChannel.Terminal_Create, this.handleCreate.bind(this))
    this.ipcHandle(IpcChannel.Terminal_Write, this.handleWrite.bind(this))
    this.ipcHandle(IpcChannel.Terminal_Resize, this.handleResize.bind(this))
    this.ipcHandle(IpcChannel.Terminal_Kill, this.handleKill.bind(this))
    this.ipcHandle(IpcChannel.Terminal_GetShells, this.handleGetShells.bind(this))

    this.ipcOn(IpcChannel.Terminal_Data, this.handleData.bind(this))
    this.ipcOn(IpcChannel.Terminal_Exit, this.handleExit.bind(this))
  }

  private async handleCreate(
    event: Electron.IpcMainInvokeEvent,
    options: { id: string; cols: number; rows: number; shell?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { id, cols, rows, shell } = options

      if (this.sessions.has(id)) {
        return { success: false, error: 'Terminal session already exists' }
      }

      const defaultShell = this.getDefaultShell()
      const shellPath = shell || defaultShell

      const ptyProcess = pty.spawn(shellPath, [], {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: os.homedir(),
        env: { ...process.env, TERM: 'xterm-256color' }
      })

      const session: TerminalSession = {
        id,
        pty: ptyProcess,
        cols: cols || 80,
        rows: rows || 24
      }

      this.sessions.set(id, session)

      ptyProcess.onData((data: string) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IpcChannel.Terminal_Data, { id, data })
        }
      })

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IpcChannel.Terminal_Exit, { id, exitCode })
        }
        this.sessions.delete(id)
      })

      logger.info(`Terminal session created: ${id}`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to create terminal session', error as Error)
      return { success: false, error: errorMessage }
    }
  }

  private async handleWrite(_event: Electron.IpcMainInvokeEvent, options: { id: string; data: string }): Promise<void> {
    const { id, data } = options
    const session = this.sessions.get(id)

    if (session) {
      session.pty.write(data)
    }
  }

  private async handleResize(
    _event: Electron.IpcMainInvokeEvent,
    options: { id: string; cols: number; rows: number }
  ): Promise<void> {
    const { id, cols, rows } = options
    const session = this.sessions.get(id)

    if (session) {
      session.pty.resize(cols, rows)
      session.cols = cols
      session.rows = rows
    }
  }

  private async handleKill(_event: Electron.IpcMainInvokeEvent, options: { id: string }): Promise<void> {
    const { id } = options
    const session = this.sessions.get(id)

    if (session) {
      session.pty.kill()
      this.sessions.delete(id)
      logger.info(`Terminal session killed: ${id}`)
    }
  }

  private async handleGetShells(): Promise<string[]> {
    const shells: string[] = []

    if (process.platform === 'win32') {
      shells.push('cmd.exe', 'powershell.exe')
    } else {
      shells.push('/bin/bash', '/bin/zsh', '/bin/sh')
      if (process.platform === 'darwin') {
        shells.push('/bin/fish')
      }
    }

    return shells
  }

  private handleData(_event: Electron.IpcMainEvent, data: { id: string; data: string }): void {
    const session = this.sessions.get(data.id)
    if (session) {
      session.pty.write(data.data)
    }
  }

  private handleExit(_event: Electron.IpcMainEvent, data: { id: string; exitCode: number }): void {
    const session = this.sessions.get(data.id)
    if (session) {
      session.pty.kill()
      this.sessions.delete(data.id)
    }
  }

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe'
    } else {
      return process.env.SHELL || '/bin/bash'
    }
  }

  private disposeAllSessions(): void {
    for (const [id, session] of this.sessions) {
      try {
        session.pty.kill()
      } catch (error) {
        logger.error(`Failed to kill terminal session ${id}`, error as Error)
      }
    }
    this.sessions.clear()
  }
}
