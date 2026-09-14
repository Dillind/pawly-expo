import type { SFSymbol } from 'sf-symbols-typescript';

export type MenuAction = {
  id: string;
  label: string;
  systemImage?: SFSymbol;
  isDestructive?: boolean;
  hasDividerBefore?: boolean;
  onPress: () => void;
};

export type ActionMenuProps = {
  label: string;
  systemImage?: SFSymbol;
  actions: MenuAction[];
  // When set, a tap runs this and a long press opens the menu. Leave it off unless the menu has
  // an obvious default — otherwise the tap target lies.
  onPrimaryAction?: () => void;
};
