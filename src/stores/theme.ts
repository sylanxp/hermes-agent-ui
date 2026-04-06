/**
 * 主题管理服务
 */

import { ref, watch, type Ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

// 主题配置
const themeConfig = {
  light: {
    primary: '#18a058',
    background: '#ffffff',
    cardBg: '#f5f7f9',
    text: '#333333',
    border: '#e0e0e6'
  },
  dark: {
    primary: '#63e6be',
    background: '#1a1a2e',
    cardBg: '#16213e',
    text: '#ffffff',
    border: 'rgba(255,255,255,0.1)'
  }
}

// 当前主题
const currentTheme = ref<ThemeMode>((localStorage.getItem('theme') as ThemeMode) || 'dark')

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: ThemeMode) {
  const html = document.documentElement
  html.setAttribute('data-theme', theme)
  
  // 设置 Naive UI 主题
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#1a1a2e' : '#ffffff')
  }
}

/**
 * 切换主题
 */
export function toggleTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
}

/**
 * 设置主题
 */
export function setTheme(theme: ThemeMode) {
  currentTheme.value = theme
}

/**
 * 获取当前主题
 */
export function useTheme(): Ref<ThemeMode> {
  return currentTheme
}

/**
 * 获取主题配置
 */
export function getThemeConfig() {
  return themeConfig[currentTheme.value]
}

/**
 * 初始化主题
 */
export function initTheme() {
  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }, { immediate: true })
  
  // 监听系统主题变化
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    // 如果没有手动设置过主题，跟随系统
    if (!localStorage.getItem('theme')) {
      currentTheme.value = mediaQuery.matches ? 'dark' : 'light'
    }
    
    mediaQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        currentTheme.value = e.matches ? 'dark' : 'light'
      }
    })
  }
}

// 导出组合式函数
export function useThemeStore() {
  return {
    theme: currentTheme,
    toggle: toggleTheme,
    set: setTheme,
    config: getThemeConfig
  }
}
