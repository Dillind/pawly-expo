import { iconMap, type IconName } from '@/constants/icon-map';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  name: IconName;
  size?: number;
  color?: ThemeColor;
  strokeWidth?: number;
};

const Icon = ({ name, size = 16, color = 'text', strokeWidth }: Props) => {
  const theme = useTheme();
  const LucideIcon = iconMap[name];

  return (
    <LucideIcon
      size={size}
      color={theme.colors[color]}
      strokeWidth={strokeWidth}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
};

export default Icon;
