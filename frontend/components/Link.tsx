import React, { type AnchorHTMLAttributes, type ReactNode } from 'react'

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string
  href?: string
  children: ReactNode
}

export function Link({ to, href, children, className, ...props }: LinkProps) {
  const destination = to || href || '/'
  return (
    <a href={destination} className={className} {...props}>
      {children}
    </a>
  )
}
