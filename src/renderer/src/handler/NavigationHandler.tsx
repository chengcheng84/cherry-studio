import NavigationService from '@renderer/services/NavigationService'
import { IpcChannel } from '@shared/IpcChannel'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

const NavigationHandler: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    NavigationService.setNavigate(navigate)
  }, [navigate])

  useEffect(() => {
    const handleNavigateToAbout = () => {
      void navigate({ to: '/settings/about' })
    }

    const handleNavigateToSettings = () => {
      void navigate({ to: '/settings/provider' })
    }

    const removeAboutListener = window.electron.ipcRenderer.on(
      IpcChannel.Windows_NavigateToAbout,
      handleNavigateToAbout
    )
    const removeSettingsListener = window.electron.ipcRenderer.on(
      IpcChannel.Windows_NavigateToSettings,
      handleNavigateToSettings
    )

    return () => {
      removeAboutListener()
      removeSettingsListener()
    }
  }, [navigate])

  return null
}

export default NavigationHandler
