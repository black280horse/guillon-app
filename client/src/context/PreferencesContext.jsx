import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'guillon-preferences'

const defaultPreferences = {
  currency: 'ARS',
  exchangeRate: 1100,
  numberFormat: 'compact',
  timezone: 'America/Argentina/Buenos_Aires',
  theme: 'dark',
  notifications: {
    dueTasks: true,
    weeklySummary: true,
    aiSuggestions: false,
  },
}

const PreferencesContext = createContext(null)

function currencyLocale(currency) {
  return currency === 'ARS' ? 'es-AR' : 'en-US'
}

function sanitizePreferences(raw) {
  if (!raw || typeof raw !== 'object') return defaultPreferences

  return {
    ...defaultPreferences,
    ...raw,
    exchangeRate: Number(raw.exchangeRate) > 0 ? Number(raw.exchangeRate) : defaultPreferences.exchangeRate,
    notifications: {
      ...defaultPreferences.notifications,
      ...(raw.notifications || {}),
    },
  }
}

function decimalsForCurrency(currency, numberFormat) {
  if (numberFormat === 'compact') return currency === 'USD' ? 1 : 0
  return currency === 'USD' ? 2 : 0
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? sanitizePreferences(JSON.parse(raw)) : defaultPreferences
    } catch {
      return defaultPreferences
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    document.documentElement.dataset.theme = preferences.theme
  }, [preferences])

  const value = useMemo(() => {
    const convertAmount = amount => {
      if (amount == null || Number.isNaN(Number(amount))) return null
      const numericAmount = Number(amount)
      if (preferences.currency === 'USD') {
        return numericAmount / preferences.exchangeRate
      }
      return numericAmount
    }

    return {
      preferences,
      setPreferences,
      updatePreference: (key, val) => setPreferences(current => sanitizePreferences({ ...current, [key]: val })),
      updateNotification: (key, val) => setPreferences(current => sanitizePreferences({
        ...current,
        notifications: { ...current.notifications, [key]: val },
      })),
      convertAmount,
      formatCurrency: amount => {
        const converted = convertAmount(amount)
        if (converted == null) return '-'

        const locale = currencyLocale(preferences.currency)
        const maximumFractionDigits = decimalsForCurrency(preferences.currency, preferences.numberFormat)
        const minimumFractionDigits = preferences.numberFormat === 'compact' ? 0 : maximumFractionDigits
        const options = preferences.numberFormat === 'compact'
          ? {
              style: 'currency',
              currency: preferences.currency,
              notation: 'compact',
              maximumFractionDigits,
            }
          : {
              style: 'currency',
              currency: preferences.currency,
              minimumFractionDigits,
              maximumFractionDigits,
            }

        return new Intl.NumberFormat(locale, options).format(converted)
      },
      formatNumber: amount => {
        if (amount == null) return '-'
        const locale = currencyLocale(preferences.currency)
        const options = preferences.numberFormat === 'compact'
          ? { notation: 'compact', maximumFractionDigits: 1 }
          : { maximumFractionDigits: 0 }
        return new Intl.NumberFormat(locale, options).format(amount)
      },
    }
  }, [preferences])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences debe usarse dentro de PreferencesProvider')
  return context
}
