import { cn } from '@/lib/utils'

// Aino's first brand mark is intentionally vector-native: it stays crisp in
// the titlebar, onboarding cards, and packaged About panel without shipping a
// third-party image. The mark is deliberately small and neutral so a future
// visual identity can replace this component without touching its consumers.
export function BrandMark({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md', className)}
      {...props}
    >
      <svg aria-hidden="true" className="size-full" viewBox="0 0 64 64">
        <rect fill="var(--theme-primary)" height="60" rx="16" width="60" x="2" y="2" />
        <path
          d="M13 48 28.4 16h7.2L51 48h-7.4l-3.2-7.5H23.6L20.4 48H13Zm13.4-14h11.2L32 21.2 26.4 34Z"
          fill="var(--theme-background-seed)"
        />
        <circle cx="47" cy="16" fill="var(--theme-accent-soft)" r="4.5" />
      </svg>
    </span>
  )
}
