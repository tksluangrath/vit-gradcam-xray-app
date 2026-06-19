import { ReactNode } from 'react'

interface TwoColumnLayoutProps {
  left: ReactNode
  right: ReactNode
}

export function TwoColumnLayout({ left, right }: TwoColumnLayoutProps) {
  return (
    <>
      <style>{`
        .two-col-layout {
          display: grid;
          grid-template-columns: 40% 60%;
          gap: var(--spacing-lg);
          padding: var(--spacing-lg);
          min-height: calc(100vh - var(--header-height));
        }
        @media (max-width: 768px) {
          .two-col-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="two-col-layout">
        <div>{left}</div>
        <div>{right}</div>
      </div>
    </>
  )
}
