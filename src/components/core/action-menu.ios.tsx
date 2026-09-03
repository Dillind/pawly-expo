import { Button, Divider, Host, Menu } from '@expo/ui/swift-ui';

import type { ActionMenuProps } from './action-menu.types';

/**
 * A native iOS pull-down menu (UIMenu), presented by UIKit in its own window.
 * That is the whole point of it: an in-tree dropdown gets clipped by a sheet or
 * a scroll view, and this cannot be.
 *
 * This is for COMMANDS. For choosing one value from a set, use
 * `DropdownPickerValidated`, which is a Picker and draws a tick beside the
 * selected row.
 */
const ActionMenu = ({ label, systemImage, actions, onPrimaryAction }: ActionMenuProps) => (
  <Host matchContents>
    <Menu label={label} systemImage={systemImage} onPrimaryAction={onPrimaryAction}>
      {actions.map((action, index) => [
        action.hasDividerBefore && index > 0 ? <Divider key={`${action.id}-divider`} /> : null,
        <Button
          key={action.id}
          label={action.label}
          systemImage={action.systemImage}
          role={action.isDestructive ? 'destructive' : undefined}
          onPress={action.onPress}
        />
      ])}
    </Menu>
  </Host>
);

export default ActionMenu;
