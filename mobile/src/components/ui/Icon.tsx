import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  /** SVG path data (24x24 viewBox, stroke style). */
  path: string;
  size?: number;
  color?: string;
  /** Whether the path is a stroke outline (default) or a solid fill. */
  filled?: boolean;
}

/** Renders a 24x24 line icon from raw SVG path data (matching the web app). */
export function Icon({ path, size = 22, color = '#0f172a', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={path}
        fill={filled ? color : 'none'}
        stroke={filled ? 'none' : color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
