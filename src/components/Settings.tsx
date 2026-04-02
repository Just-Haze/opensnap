import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Folder, Keyboard, Palette, Bell, Monitor, X, RotateCcw } from 'lucide-react'
import * as Switch from '@radix-ui/react-switch'
import * as Select from '@radix-ui/react-select'
import * as Slider from '@radix-ui/react-slider'
import { toast } from 'sonner'

interface AppSettings {
  autoStart: boolean
  startMinimized: boolean
  minimizeToTray: boolean
  closeToTray: boolean
  showNotifications: boolean
  captureFormat: 'png' | 'jpg'
  captureQuality: number
  defaultSavePath: string
  captureHotkey: string
  theme: 'light' | 'dark' | 'system'
}

interface SettingsProps {
  onClose: () => void
}

export default function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDirty, setIsDirty] = useState(false)

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const currentSettings = await window.electronAPI?.getSettings()
      if (currentSettings) {
        setSettings(currentSettings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = (updates: Partial<AppSettings>) => {
    if (!settings) return
    
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    setIsDirty(true)
  }

  const saveSettings = async () => {
    if (!settings) return
    
    try {
      await window.electronAPI?.saveSettings(settings)
      setIsDirty(false)
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    }
  }

  const resetSettings = async () => {
    try {
      const defaultSettings = await window.electronAPI?.resetSettings()
      if (defaultSettings) {
        setSettings(defaultSettings)
        setIsDirty(false)
        toast.success('Settings reset to defaults')
      }
    } catch (error) {
      console.error('Failed to reset settings:', error)
      toast.error('Failed to reset settings')
    }
  }

  const selectFolder = async () => {
    try {
      const result = await window.electronAPI?.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Default Save Location'
      })
      
      if (result && !result.canceled && result.filePaths.length > 0) {
        updateSettings({ defaultSavePath: result.filePaths[0] })
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
      toast.error('Failed to select folder')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-white">Loading settings...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-red-400">Failed to load settings</div>
      </div>
    )
  }

  return (
    <div className="h-full bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-indigo-400" />
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              onClick={saveSettings}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* General Settings */}
        <section>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-indigo-400" />
            General
          </h2>
          <div className="space-y-4">
            {/* Auto Start */}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <div className="font-medium">Start with system</div>
                <div className="text-sm text-zinc-400">Launch OpenSnap when your computer starts</div>
              </div>
              <Switch.Root
                checked={settings.autoStart}
                onCheckedChange={(checked) => updateSettings({ autoStart: checked })}
                className="w-11 h-6 bg-zinc-700 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            {/* Start Minimized */}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <div className="font-medium">Start minimized</div>
                <div className="text-sm text-zinc-400">Launch in system tray without showing window</div>
              </div>
              <Switch.Root
                checked={settings.startMinimized}
                onCheckedChange={(checked) => updateSettings({ startMinimized: checked })}
                className="w-11 h-6 bg-zinc-700 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            {/* Minimize to Tray */}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <div className="font-medium">Minimize to tray</div>
                <div className="text-sm text-zinc-400">Hide window to system tray when minimized</div>
              </div>
              <Switch.Root
                checked={settings.minimizeToTray}
                onCheckedChange={(checked) => updateSettings({ minimizeToTray: checked })}
                className="w-11 h-6 bg-zinc-700 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            {/* Close to Tray */}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <div className="font-medium">Close to tray</div>
                <div className="text-sm text-zinc-400">Keep app running in tray when window is closed</div>
              </div>
              <Switch.Root
                checked={settings.closeToTray}
                onCheckedChange={(checked) => updateSettings({ closeToTray: checked })}
                className="w-11 h-6 bg-zinc-700 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <div className="font-medium">Theme</div>
                <div className="text-sm text-zinc-400">Choose your preferred theme</div>
              </div>
              <Select.Root
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark' | 'system') => updateSettings({ theme: value })}
              >
                <Select.Trigger className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm min-w-[120px] justify-between">
                  <Select.Value />
                  <Select.Icon>
                    <Palette className="w-4 h-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-zinc-800 border border-white/10 rounded-lg p-1 shadow-lg z-50">
                    <Select.Viewport>
                      <Select.Item value="system" className="px-3 py-2 text-sm cursor-pointer hover:bg-white/10 rounded">
                        <Select.ItemText>System</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="light" className="px-3 py-2 text-sm cursor-pointer hover:bg-white/10 rounded">
                        <Select.ItemText>Light</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="dark" className="px-3 py-2 text-sm cursor-pointer hover:bg-white/10 rounded">
                        <Select.ItemText>Dark</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>
        </section>

        {/* Capture Settings */}
        <section>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-indigo-400" />
            Capture
          </h2>
          <div className="space-y-4">
            {/* Default Save Path */}
            <div className="py-3 border-b border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium">Default save location</div>
                  <div className="text-sm text-zinc-400">Where screenshots are saved by default</div>
                </div>
                <button
                  onClick={selectFolder}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-sm transition-colors"
                >
                  <Folder className="w-4 h-4" />
                  Browse
                </button>
              </div>
              <div className="text-sm text-zinc-300 bg-zinc-900 border border-white/10 rounded px-3 py-2 font-mono">
                {settings.defaultSavePath}
              </div>
            </div>

            {/* Capture Format */}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <div className="font-medium">Default format</div>
                <div className="text-sm text-zinc-400">File format for saved screenshots</div>
              </div>
              <Select.Root
                value={settings.captureFormat}
                onValueChange={(value: 'png' | 'jpg') => updateSettings({ captureFormat: value })}
              >
                <Select.Trigger className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm min-w-[100px] justify-between">
                  <Select.Value />
                  <Select.Icon>
                    <Monitor className="w-4 h-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-zinc-800 border border-white/10 rounded-lg p-1 shadow-lg z-50">
                    <Select.Viewport>
                      <Select.Item value="png" className="px-3 py-2 text-sm cursor-pointer hover:bg-white/10 rounded">
                        <Select.ItemText>PNG</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="jpg" className="px-3 py-2 text-sm cursor-pointer hover:bg-white/10 rounded">
                        <Select.ItemText>JPG</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* JPEG Quality */}
            {settings.captureFormat === 'jpg' && (
              <div className="py-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium">JPEG Quality</div>
                    <div className="text-sm text-zinc-400">Higher values mean better quality but larger files</div>
                  </div>
                  <span className="text-sm font-medium">{settings.captureQuality}%</span>
                </div>
                <Slider.Root
                  value={[settings.captureQuality]}
                  onValueChange={(value) => updateSettings({ captureQuality: value[0] })}
                  min={10}
                  max={100}
                  step={5}
                  className="relative flex items-center w-full h-5"
                >
                  <Slider.Track className="relative bg-zinc-700 grow rounded-full h-2">
                    <Slider.Range className="absolute bg-indigo-600 rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-indigo-600 rounded-full hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900" />
                </Slider.Root>
              </div>
            )}
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            Keyboard Shortcuts
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <div className="font-medium">Capture hotkey</div>
                <div className="text-sm text-zinc-400">Global shortcut to open screenshot capture</div>
              </div>
              <input
                type="text"
                value={settings.captureHotkey}
                onChange={(e) => updateSettings({ captureHotkey: e.target.value })}
                className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm min-w-[200px] focus:outline-none focus:border-indigo-500"
                placeholder="e.g., CommandOrControl+Shift+S"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <div className="font-medium">Show notifications</div>
                <div className="text-sm text-zinc-400">Display system notifications for app events</div>
              </div>
              <Switch.Root
                checked={settings.showNotifications}
                onCheckedChange={(checked) => updateSettings({ showNotifications: checked })}
                className="w-11 h-6 bg-zinc-700 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-white/10">
          <button
            onClick={resetSettings}
            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={!isDirty}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}