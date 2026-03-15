import type { PropsWithChildren } from 'react'

type ControlBankProps = PropsWithChildren<{
  title: string
  description: string
  stage: 'shapes' | 'stripes' | 'color'
  status: 'locked' | 'active' | 'solved'
}>

export function ControlBank({
  title,
  description,
  stage,
  status,
  children,
}: ControlBankProps) {
  return (
    <section className="control-bank" aria-labelledby={`bank-${stage}`}>
      <header className="control-bank__header">
        <div>
          <p className="panel-label">Control bank</p>
          <h3 className="control-bank__title" id={`bank-${stage}`}>
            {title}
          </h3>
          <p className="control-bank__description">{description}</p>
        </div>
        <span className={`bank-state bank-state--${status}`}>{status}</span>
      </header>
      <div className="control-bank__body">{children}</div>
    </section>
  )
}
