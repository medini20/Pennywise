import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

const getIsMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setIsMobile(getIsMobileViewport());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}
