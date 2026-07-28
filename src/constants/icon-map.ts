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
  PawPrint,
  Pencil,
  Plus,
  UserPlus,
  Utensils,
  X
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
  plus: Plus,
  utensils: Utensils,
  pencil: Pencil,
  userPlus: UserPlus,
  pawPrint: PawPrint,
  close: X
} as const;

export type IconName = keyof typeof iconMap;
