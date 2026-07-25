import {
  Asterisk,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Dot,
  Eye,
  EyeOff,
  Utensils
} from 'lucide-react-native';

export const iconMap = {
  camera: Camera,
  asterisk: Asterisk,
  caretDown: ChevronDown,
  dot: Dot,
  eye: Eye,
  eyeOff: EyeOff,
  calendar: Calendar,
  clock: Clock,
  check: Check,
  circleAlert: CircleAlert,
  utensils: Utensils
} as const;

export type IconName = keyof typeof iconMap;
