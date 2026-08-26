import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Cek localStorage terlebih dahulu
    const savedTheme = localStorage.getItem('sbms_theme')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme
    }
    // Default standar: clean light mode
    return 'light'
  })

  // Sinkronisasi class html saat theme berubah
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.setAttribute('data-theme', 'light')
    }
    localStorage.setItem('sbms_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
