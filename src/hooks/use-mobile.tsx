
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const IS_IOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsIOS() {
  const [isIOS, setIsIOS] = React.useState<boolean>(false)
  
  React.useEffect(() => {
    setIsIOS(IS_IOS)
  }, [])
  
  return isIOS
}

export function useMobileDetection() {
  const isMobile = useIsMobile()
  const isIOS = useIsIOS()
  
  return {
    isMobile,
    isIOS,
    isSmallScreen: typeof window !== 'undefined' ? window.innerWidth < 375 : false,
    isMediumScreen: typeof window !== 'undefined' ? window.innerWidth >= 375 && window.innerWidth < 428 : false,
    safePaddingBottom: isIOS ? 'env(safe-area-inset-bottom, 0px)' : '0px',
    safePaddingTop: isIOS ? 'env(safe-area-inset-top, 0px)' : '0px'
  }
}
