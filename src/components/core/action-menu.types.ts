import type { SFSymbol } from 'sf-symbols-typescript';

export type MenuAction = {
  id: string;
  label: string;
  /** SF Symbol name, drawn by UIKit. iOS only; the fallback ignores it. */
  systemImage?: SFSymbol;
  /** Draws the row in red. Use for the one action a user cannot undo. */
  isDestructive?: boolean;
  /** Puts a separator above this row, grouping what follows. */
  hasDividerBefore?: boolean;
  onPress: () => void;
};

export type ActionMenuProps = {
  /** The trigger's text. */
  label: string;
  systemImage?: SFSymbol;
  actions: MenuAction[];
  /**
   * When set, a tap runs this and a long press opens the menu. Leave it off
   * unless the menu has an obvious default — otherwise the tap target lies.
   */
  onPrimaryAction?: () => void;
};
