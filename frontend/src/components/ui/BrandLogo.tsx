import atlasMark from '@/assets/atlas-mark.svg'

type BrandLogoProps = {
  showText?: boolean
  text?: string
  iconSizeClassName?: string
  textClassName?: string
  className?: string
}

export default function BrandLogo({
  showText = true,
  text,
  iconSizeClassName = 'h-8 w-8',
  textClassName = 'text-base font-medium tracking-tight text-neutral-50',
  className = 'flex items-center gap-2',
}: BrandLogoProps) {
  return (
    <div className={className}>
      <img src={atlasMark} alt="" aria-hidden="true" className={`${iconSizeClassName} shrink-0`} />
      {showText && text && <span className={textClassName}>{text}</span>}
    </div>
  )
}
