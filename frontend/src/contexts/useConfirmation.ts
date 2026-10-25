import { createContext, useContext } from 'react'

export interface ConfirmationOptions {
  title: string
  message: string
}

export const ConfirmationContext = createContext<((options: ConfirmationOptions) => Promise<boolean>) | null>(null)

export function useConfirmation() {
  const confirm = useContext(ConfirmationContext)
  if (!confirm) throw new Error('useConfirmation must be used inside ConfirmationProvider')
  return confirm
}
