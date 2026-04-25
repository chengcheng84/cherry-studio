import '@xterm/xterm/css/xterm.css'

import { Button } from '@cherrystudio/ui'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from '@xterm/xterm'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const TerminalPage: FC = () => {
  const { t } = useTranslation()
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionId = useRef(`terminal-${Date.now()}`)
  const isConnectedRef = useRef(false)

  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    if (!terminalRef.current) return

    const terminal = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    terminal.open(terminalRef.current)
    fitAddon.fit()

    terminalInstanceRef.current = terminal
    fitAddonRef.current = fitAddon

    terminal.writeln('\x1b[32mCherry Studio Terminal\x1b[0m')
    terminal.writeln('\x1b[90mInitializing terminal...\x1b[0m')

    const cleanupData = window.api.terminal.onData((data) => {
      if (data.id === sessionId.current && terminalInstanceRef.current) {
        terminalInstanceRef.current.write(data.data)
      }
    })

    const cleanupExit = window.api.terminal.onExit((data) => {
      if (data.id === sessionId.current) {
        setIsConnected(false)
        terminalInstanceRef.current?.writeln(`\r\n\x1b[33mProcess exited with code ${data.exitCode}\x1b[0m`)
        terminalInstanceRef.current?.writeln('\x1b[90mPress any key to restart...\x1b[0m')
      }
    })

    terminal.onData((data) => {
      if (isConnected) {
        void window.api.terminal.write(sessionId.current, data)
      }
    })

    terminal.onResize(({ cols, rows }) => {
      if (isConnected) {
        void window.api.terminal.resize(sessionId.current, cols, rows)
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalInstanceRef.current) {
        fitAddonRef.current.fit()
      }
    })
    resizeObserver.observe(terminalRef.current)

    void initTerminal()

    return () => {
      cleanupData()
      cleanupExit()
      resizeObserver.disconnect()
      if (isConnectedRef.current) {
        void window.api.terminal.kill(sessionId.current)
      }
      terminal.dispose()
    }
  }, [isConnected])

  const initTerminal = async () => {
    try {
      setError(null)
      const result = await window.api.terminal.create({
        id: sessionId.current,
        cols: terminalInstanceRef.current?.cols || 80,
        rows: terminalInstanceRef.current?.rows || 24
      })

      if (result.success) {
        setIsConnected(true)
        terminalInstanceRef.current?.writeln('\x1b[32mTerminal connected!\x1b[0m\r\n')
      } else {
        setError(result.error || 'Failed to create terminal')
        terminalInstanceRef.current?.writeln(`\x1b[31mError: ${result.error}\x1b[0m`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      terminalInstanceRef.current?.writeln(`\x1b[31mError: ${errorMessage}\x1b[0m`)
    }
  }

  const handleRestart = () => {
    sessionId.current = `terminal-${Date.now()}`
    void initTerminal()
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--background)]">
      <Navbar>
        <NavbarCenter style={{ borderRight: 'none' }}>{t('title.terminal')}</NavbarCenter>
      </Navbar>
      <div className="flex flex-1 flex-col overflow-hidden">
        {error && (
          <div className="flex items-center justify-between bg-red-500/10 px-4 py-2 text-red-500">
            <span>{error}</span>
            <Button onClick={handleRestart} size="sm" variant="outline">
              Retry
            </Button>
          </div>
        )}
        <div ref={terminalRef} className="flex-1 p-2" style={{ backgroundColor: '#1e1e1e' }} />
      </div>
    </div>
  )
}
