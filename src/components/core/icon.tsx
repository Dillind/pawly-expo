import { iconMap, type IconName } from '@/constants/icon-map';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  name: IconName;
  size?: number;
  color?: ThemeColor;
  /** Fills the glyph's interior. Omit for the outline Lucide draws by default. */
  fill?: ThemeColor;
  strokeWidth?: number;
};

const Icon = ({ name, size = 16, color = 'text', fill, strokeWidth }: Props) => {
  const theme = useTheme();
  const LucideIcon = iconMap[name];

  return (
    <LucideIcon
      size={size}
      color={theme.colors[color]}
      fill={fill ? theme.colors[fill] : 'none'}
      strokeWidth={strokeWidth}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
};

export default Icon;
