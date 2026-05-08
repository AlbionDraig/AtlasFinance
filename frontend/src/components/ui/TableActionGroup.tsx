import type { ReactNode } from 'react'

interface TableActionGroupProps {
  children: ReactNode
}

export default function TableActionGroup({ children }: TableActionGroupProps) {
  return (
    <div className="mx-auto inline-flex items-center justify-center gap-1 rounded-md bg-brand-light/40 px-1 py-0.5">
      {children}
    </div>
  )
}