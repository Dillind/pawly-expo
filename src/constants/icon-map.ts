import {
  Asterisk,
  Calendar,
  Camera,
  ChevronDown,
  Clock,
  Dot,
  Eye,
  EyeOff
} from 'lucide-react-native';

export const iconMap = {
  camera: Camera,
  asterisk: Asterisk,
  caretDown: ChevronDown,
  dot: Dot,
  eye: Eye,
  eyeOff: EyeOff,
  calendar: Calendar,
  clock: Clock
} as const;

export type IconName = keyof typeof iconMap;
