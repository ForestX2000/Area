export const formatNumber = (value: number) => value.toLocaleString('ru-RU')

export const formatDay = (day: number) => new Date(day).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

export const formatPercent = (value: number) => `${(value * 100).toLocaleString('ru-RU', { maximumFractionDigits: value < 0.1 ? 1 : 0 })}%`
