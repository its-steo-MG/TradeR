'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const themes = [
    { name: 'light', icon: SunIcon, label: 'Light' },
    { name: 'dark', icon: MoonIcon, label: 'Dark' },
    { name: 'system', icon: ComputerDesktopIcon, label: 'System' },
  ]

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
      {themes.map(({ name, icon: Icon, label }) => (
        <motion.button
          key={name}
          onClick={() => setTheme(name)}
          className={`
            relative p-2 rounded-full transition-all duration-200
            ${theme === name 
              ? 'bg-white dark:bg-gray-700 text-accent-600 dark:text-accent-400 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-accent-600 dark:hover:text-accent-400'
            }
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={`Switch to ${label} theme`}
          title={`${label} theme`}
        >
          <Icon className="w-4 h-4" />
          {theme === name && (
            <motion.div
              className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full -z-10"
              layoutId="theme-indicator"
              transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  )
}

// Alternative dropdown version
export function ThemeToggleDropdown() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const currentTheme = theme === 'light' ? SunIcon : theme === 'dark' ? MoonIcon : ComputerDesktopIcon
  const CurrentIcon = currentTheme

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Toggle theme"
      >
        <CurrentIcon className="w-5 h-5" />
      </motion.button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20"
          >
            <button
              onClick={() => {
                setTheme('light')
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                theme === 'light' ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <SunIcon className="w-4 h-4" />
              <span>Light</span>
            </button>
            <button
              onClick={() => {
                setTheme('dark')
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                theme === 'dark' ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <MoonIcon className="w-4 h-4" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => {
                setTheme('system')
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                theme === 'system' ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <ComputerDesktopIcon className="w-4 h-4" />
              <span>System</span>
            </button>
          </motion.div>
        </>
      )}
    </div>
  )
}