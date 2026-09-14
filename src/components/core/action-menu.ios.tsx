import { Button, Divider, Host, Menu } from '@expo/ui/swift-ui';

import type { ActionMenuProps } from './action-menu.types';

// UIKit presents this in its own window, so unlike an in-tree dropdown a sheet
// cannot clip it. For commands only: to choose a value use
// `DropdownPickerValidated`.
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
