export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '\u20B90.00'
  return `\u20B9${Number(amount).toFixed(2)}`
}

export function formatDate(isoString) {
  if (!isoString) return 'N/A'
  try {
    const d = new Date(isoString)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

export function formatShortDate(isoString) {
  if (!isoString) return 'N/A'
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoString
  }
}
