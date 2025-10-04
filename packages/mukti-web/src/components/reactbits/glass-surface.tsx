import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface GlassSurfaceProps {
  backgroundOpacity?: number;
  blueOffset?: number;
  blur?: number;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  children?: React.ReactNode;
  className?: string;
  displace?: number;
  distortionScale?: number;
  greenOffset?: number;
  height?: number | string;
  mixBlendMode?:
    | 'color'
    | 'color-burn'
    | 'color-dodge'
    | 'darken'
    | 'difference'
    | 'exclusion'
    | 'hard-light'
    | 'hue'
    | 'lighten'
    | 'luminosity'
    | 'multiply'
    | 'normal'
    | 'overlay'
    | 'plus-darker'
    | 'plus-lighter'
    | 'saturation'
    | 'screen'
    | 'soft-light';
  opacity?: number;
  redOffset?: number;
  saturation?: number;
  style?: React.CSSProperties;
  width?: number | string;
  xChannel?: 'B' | 'G' | 'R';
  yChannel?: 'B' | 'G' | 'R';
}

const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return { isClient, isDark };
};

const GlassSurface: React.FC<GlassSurfaceProps> = ({
  backgroundOpacity = 0,
  blueOffset = 20,
  blur = 11,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  children,
  className = '',
  displace = 0,
  distortionScale = -180,
  greenOffset = 10,
  height = 80,
  mixBlendMode = 'difference',
  opacity = 0.93,
  redOffset = 0,
  saturation = 1,
  style = {},
  width = 200,
  xChannel = 'R',
  yChannel = 'G',
}) => {
  const uniqueId = useId().replace(/:/g, '-');
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);

  const { isClient, isDark } = useDarkMode();
  const [clientCapabilities, setClientCapabilities] = useState({
    backdropFilterSupported: false,
    svgSupported: false,
  });

  const supportsSVGFilters = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);

    if (isWebkit || isFirefox) {
      return false;
    }

    const div = document.createElement('div');
    div.style.backdropFilter = `url(#${filterId})`;
    return div.style.backdropFilter !== '';
  }, [filterId]);

  const supportsBackdropFilter = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return CSS.supports('backdrop-filter', 'blur(10px)');
  }, []);

  // Update client capabilities after hydration
  useEffect(() => {
    if (isClient) {
      setClientCapabilities({
        backdropFilterSupported: supportsBackdropFilter(),
        svgSupported: supportsSVGFilters(),
      });
    }
  }, [isClient, supportsSVGFilters, supportsBackdropFilter]);

  const generateDisplacementMap = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const actualWidth = rect?.width || 400;
    const actualHeight = rect?.height || 200;
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${
          actualHeight - edgeSize * 2
        }" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
      </svg>
    `;

    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  }, [borderRadius, borderWidth, brightness, blur, mixBlendMode, opacity, redGradId, blueGradId]);

  const updateDisplacementMap = useCallback(() => {
    feImageRef.current?.setAttribute('href', generateDisplacementMap());
  }, [generateDisplacementMap]);

  useEffect(() => {
    updateDisplacementMap();
    [
      { offset: redOffset, ref: redChannelRef },
      { offset: greenOffset, ref: greenChannelRef },
      { offset: blueOffset, ref: blueChannelRef },
    ].forEach(({ offset, ref }) => {
      if (ref.current) {
        ref.current.setAttribute('scale', (distortionScale + offset).toString());
        ref.current.setAttribute('xChannelSelector', xChannel);
        ref.current.setAttribute('yChannelSelector', yChannel);
      }
    });

    gaussianBlurRef.current?.setAttribute('stdDeviation', displace.toString());
  }, [
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode,
    updateDisplacementMap,
  ]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateDisplacementMap, 0);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateDisplacementMap]);

  useEffect(() => {
    setTimeout(updateDisplacementMap, 0);
  }, [width, height, updateDisplacementMap]);

  const getContainerStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      ...style,
      '--glass-frost': backgroundOpacity.toString(),
      '--glass-saturation': saturation.toString(),
      borderRadius: `${borderRadius}px`,
      height: typeof height === 'number' ? `${height}px` : height,
      width: typeof width === 'number' ? `${width}px` : width,
    } as React.CSSProperties;

    // Return fallback styles during SSR or before client-side hydration
    if (!isClient) {
      return {
        ...baseStyles,
        backdropFilter: 'blur(12px) saturate(1.8) brightness(1.1)',
        background: 'rgba(255, 255, 255, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: `0 8px 32px 0 rgba(31, 38, 135, 0.2),
                    0 2px 16px 0 rgba(31, 38, 135, 0.1),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                    inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)`,
        WebkitBackdropFilter: 'blur(12px) saturate(1.8) brightness(1.1)',
      };
    }

    const { backdropFilterSupported, svgSupported } = clientCapabilities;

    if (svgSupported) {
      return {
        ...baseStyles,
        backdropFilter: `url(#${filterId}) saturate(${saturation})`,
        background: isDark
          ? `hsl(0 0% 0% / ${backgroundOpacity})`
          : `hsl(0 0% 100% / ${backgroundOpacity})`,
        boxShadow: isDark
          ? `0 0 2px 1px color-mix(in oklch, white, transparent 65%) inset,
             0 0 10px 4px color-mix(in oklch, white, transparent 85%) inset,
             0px 4px 16px rgba(17, 17, 26, 0.05),
             0px 8px 24px rgba(17, 17, 26, 0.05),
             0px 16px 56px rgba(17, 17, 26, 0.05),
             0px 4px 16px rgba(17, 17, 26, 0.05) inset,
             0px 8px 24px rgba(17, 17, 26, 0.05) inset,
             0px 16px 56px rgba(17, 17, 26, 0.05) inset`
          : `0 0 2px 1px color-mix(in oklch, black, transparent 85%) inset,
             0 0 10px 4px color-mix(in oklch, black, transparent 90%) inset,
             0px 4px 16px rgba(17, 17, 26, 0.05),
             0px 8px 24px rgba(17, 17, 26, 0.05),
             0px 16px 56px rgba(17, 17, 26, 0.05),
             0px 4px 16px rgba(17, 17, 26, 0.05) inset,
             0px 8px 24px rgba(17, 17, 26, 0.05) inset,
             0px 16px 56px rgba(17, 17, 26, 0.05) inset`,
      };
    } else {
      if (isDark) {
        if (!backdropFilterSupported) {
          return {
            ...baseStyles,
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
                        inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)`,
          };
        } else {
          return {
            ...baseStyles,
            backdropFilter: 'blur(12px) saturate(1.8) brightness(1.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
                        inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)`,
            WebkitBackdropFilter: 'blur(12px) saturate(1.8) brightness(1.2)',
          };
        }
      } else {
        if (!backdropFilterSupported) {
          return {
            ...baseStyles,
            background: 'rgba(255, 255, 255, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                        inset 0 -1px 0 0 rgba(255, 255, 255, 0.3)`,
          };
        } else {
          return {
            ...baseStyles,
            backdropFilter: 'blur(12px) saturate(1.8) brightness(1.1)',
            background: 'rgba(255, 255, 255, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: `0 8px 32px 0 rgba(31, 38, 135, 0.2),
                        0 2px 16px 0 rgba(31, 38, 135, 0.1),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                        inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)`,
            WebkitBackdropFilter: 'blur(12px) saturate(1.8) brightness(1.1)',
          };
        }
      }
    }
  };

  const glassSurfaceClasses =
    'relative flex items-center justify-center overflow-hidden transition-opacity duration-[260ms] ease-out';

  const focusVisibleClasses = isDark
    ? 'focus-visible:outline-2 focus-visible:outline-[#0A84FF] focus-visible:outline-offset-2'
    : 'focus-visible:outline-2 focus-visible:outline-[#007AFF] focus-visible:outline-offset-2';

  return (
    <div
      className={`${glassSurfaceClasses} ${focusVisibleClasses} ${className}`}
      ref={containerRef}
      style={getContainerStyles()}
    >
      <svg
        className="w-full h-full pointer-events-none absolute inset-0 opacity-0 -z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter
            colorInterpolationFilters="sRGB"
            height="100%"
            id={filterId}
            width="100%"
            x="0%"
            y="0%"
          >
            <feImage
              height="100%"
              preserveAspectRatio="none"
              ref={feImageRef}
              result="map"
              width="100%"
              x="0"
              y="0"
            />

            <feDisplacementMap
              id="redchannel"
              in="SourceGraphic"
              in2="map"
              ref={redChannelRef}
              result="dispRed"
            />
            <feColorMatrix
              in="dispRed"
              result="red"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
            />

            <feDisplacementMap
              id="greenchannel"
              in="SourceGraphic"
              in2="map"
              ref={greenChannelRef}
              result="dispGreen"
            />
            <feColorMatrix
              in="dispGreen"
              result="green"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
            />

            <feDisplacementMap
              id="bluechannel"
              in="SourceGraphic"
              in2="map"
              ref={blueChannelRef}
              result="dispBlue"
            />
            <feColorMatrix
              in="dispBlue"
              result="blue"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />

            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur in="output" ref={gaussianBlurRef} stdDeviation="0.7" />
          </filter>
        </defs>
      </svg>

      <div className="w-full h-full flex items-center justify-center p-2 rounded-[inherit] relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassSurface;
