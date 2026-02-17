import { cn } from '@/lib/utils'

interface LogoProps {
  /** "dark" = black logo (for light backgrounds), "light" = white logo (for dark backgrounds) */
  variant?: 'dark' | 'light'
  /** sm = h-6, md = h-10, lg = h-20 */
  size?: 'sm' | 'md' | 'lg'
  /** Show "OpsHub" label */
  showLabel?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-10',
  lg: 'h-20',
} as const

const labelClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-2xl',
} as const

export function Logo({
  variant = 'dark',
  size = 'md',
  showLabel = false,
  className,
}: LogoProps) {
  const src = variant === 'dark' ? '/logo-black.svg' : '/logo-white.svg'
  const labelColor = variant === 'dark' ? 'text-navy-500' : 'text-steel-400'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="108"
        className={cn(sizeClasses[size], 'w-auto shrink-0')}
      />
      {showLabel && (
        <span
          className={cn(
            labelClasses[size],
            'font-black uppercase tracking-[0.12em] truncate',
            labelColor
          )}
          style={{ fontStretch: 'condensed' }}
        >
          OpsHub
        </span>
      )}
    </div>
  )
}
