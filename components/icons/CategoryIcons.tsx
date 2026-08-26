/**
 * Category Icons — "Engineered Utility"
 * 2px stroke · square caps · miter joins
 * Active = tank/interior fills accent green
 */
import { COLORS } from "@/constants/design";
import React from "react";
import Svg, { Circle, Path, Rect as SvgRect } from "react-native-svg";

const ICON = {
  strokeWidth: 2,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
};

type IconProps = { color: string; active: boolean };

export function AllIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <SvgRect
        x="3"
        y="3"
        width="7"
        height="7"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <SvgRect
        x="14"
        y="3"
        width="7"
        height="7"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <SvgRect
        x="3"
        y="14"
        width="7"
        height="7"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <SvgRect
        x="14"
        y="14"
        width="7"
        height="7"
        stroke={color}
        {...ICON}
        fill={fill}
      />
    </Svg>
  );
}

export function CafeIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="7" cy="24" r="4" stroke={color} {...ICON} />
      <Circle cx="25" cy="24" r="4" stroke={color} {...ICON} />
      <Path d="M11 24L13 17L19 15L24 20" stroke={color} {...ICON} />
      <Path
        d="M13 17L15 11L19 10L19 15Z"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <Path d="M19 10L22 9" stroke={color} {...ICON} />
      <Path d="M22 9L24 10" stroke={color} {...ICON} />
      <Path d="M11 21L9 18" stroke={color} {...ICON} />
      <Path d="M24 20L25 20" stroke={color} {...ICON} />
    </Svg>
  );
}

export function CruiserIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="6" cy="24" r="4.5" stroke={color} {...ICON} />
      <Circle cx="26" cy="24" r="4" stroke={color} {...ICON} />
      <Path d="M10.5 24L12 18L18 16L24 20" stroke={color} {...ICON} />
      <Path
        d="M12 18L14 13L18 12L18 16Z"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <Path d="M18 12L20 8" stroke={color} {...ICON} />
      <Path d="M20 8L22 7" stroke={color} {...ICON} />
      <Path d="M10.5 18L9.5 12" stroke={color} {...ICON} />
      <Path d="M24 20L26.5 20" stroke={color} {...ICON} />
    </Svg>
  );
}

export function ScramblerIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="6.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Circle cx="25.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Path d="M11 23L13 16L19 14L24 17" stroke={color} {...ICON} />
      <Path
        d="M13 16L15 12L19 11L19 14Z"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <Path d="M11 20L8 16L9 14" stroke={color} {...ICON} />
      <Path d="M19 11L20 8L22 7" stroke={color} {...ICON} />
      <Path
        d="M3.5 20L4.5 19"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="square"
      />
      <Path
        d="M5 19.5L6 18.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="square"
      />
      <Path
        d="M22.5 19.5L23.5 18.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="square"
      />
      <Path d="M24 17L25.5 18.5" stroke={color} {...ICON} />
    </Svg>
  );
}

export function StandardIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="6.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Circle cx="25.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Path d="M11 23L13 16L19 14L24 18" stroke={color} {...ICON} />
      <Path
        d="M13 16L15 12L19 11L19 14Z"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <Path d="M19 11L20 9" stroke={color} {...ICON} />
      <Path d="M18 9L22 9" stroke={color} {...ICON} />
      <Path d="M24 18L25.5 19" stroke={color} {...ICON} />
    </Svg>
  );
}

export function SportIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="6.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Circle cx="25.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Path d="M11 23L13 16L19 14L24 18" stroke={color} {...ICON} />
      <Path
        d="M13 16L14 11L19 10L19 14L13 16Z"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <Path d="M17 10L19 7L22 7" stroke={color} {...ICON} />
      <Path d="M13 16L10 15L9 17" stroke={color} {...ICON} />
      <Path d="M24 18L26 19" stroke={color} {...ICON} />
    </Svg>
  );
}

export function VintageIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="6.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Circle cx="25.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Path d="M11 23L13 16L19 14L24 18" stroke={color} {...ICON} />
      <Path
        d="M13 16Q14 11 17 11Q19 11 19 14Z"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <Circle cx="24" cy="14" r="2.5" stroke={color} {...ICON} fill={fill} />
      <Path d="M19 11L21 9" stroke={color} {...ICON} />
      <Path d="M11 18L9 17" stroke={color} {...ICON} />
      <Path d="M24 16.5L25 18.5" stroke={color} {...ICON} />
    </Svg>
  );
}

export function DualSportIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="6.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Circle cx="25.5" cy="23" r="4.5" stroke={color} {...ICON} />
      <Path d="M11.5 23L14 14L19 12L24 16" stroke={color} {...ICON} />
      <Path d="M14 14L16 10L19 9L19 12Z" stroke={color} {...ICON} fill={fill} />
      <Path d="M19 9L20 6L22 5" stroke={color} {...ICON} />
      <Path d="M22 12L26 10" stroke={color} {...ICON} />
      <Path d="M24 16L25 19.5" stroke={color} {...ICON} />
      <Path d="M11 21L9 17L10 15" stroke={color} {...ICON} />
    </Svg>
  );
}

export function ChopperIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="6" cy="24" r="4.5" stroke={color} {...ICON} />
      <Circle cx="27" cy="24" r="3.5" stroke={color} {...ICON} />
      <Path d="M10.5 24L12 18L17 16L22 18" stroke={color} {...ICON} />
      <Path
        d="M12 18L14 14L17 13L17 16Z"
        stroke={color}
        {...ICON}
        fill={fill}
      />
      <Path d="M17 13L18 9L16 6" stroke={color} {...ICON} />
      <Path d="M18 9L20 6" stroke={color} {...ICON} />
      <Path d="M22 18L27 20.5" stroke={color} {...ICON} />
      <Path d="M10 18L9 12" stroke={color} {...ICON} />
    </Svg>
  );
}

export function ProjectIcon({ color, active }: IconProps) {
  const fill = active ? COLORS.accent : "none";
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="6.5" cy="24" r="4.5" stroke={color} {...ICON} />
      <Circle cx="25.5" cy="24" r="4.5" stroke={color} {...ICON} />
      <Path
        d="M11 24L14 16L20 14L25 18"
        stroke={color}
        {...ICON}
        strokeDasharray="4 3"
      />
      <Path
        d="M14 8L18 12"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="square"
      />
      <Circle cx="13" cy="7" r="2.5" stroke={color} {...ICON} fill={fill} />
      <Path
        d="M19 13L20 14"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="square"
      />
      <SvgRect
        x="19.5"
        y="12.5"
        width="2"
        height="4"
        rx="0"
        transform="rotate(-45 19.5 12.5)"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

/** Category config array for the filter bar */
export const CATEGORIES: {
  key: string;
  label: string;
  Icon: React.FC<IconProps>;
}[] = [
  { key: "all", label: "ALL", Icon: AllIcon },
  { key: "cafe", label: "CAFÉ", Icon: CafeIcon },
  { key: "cruiser", label: "CRUISER", Icon: CruiserIcon },
  { key: "scrambler", label: "SCRAMBLER", Icon: ScramblerIcon },
  { key: "standard", label: "STANDARD", Icon: StandardIcon },
  { key: "sport", label: "SPORT", Icon: SportIcon },
  { key: "vintage", label: "VINTAGE", Icon: VintageIcon },
  { key: "dualsport", label: "DUAL SPT", Icon: DualSportIcon },
  { key: "chopper", label: "CHOPPER", Icon: ChopperIcon },
  { key: "project", label: "PROJECT", Icon: ProjectIcon },
];
