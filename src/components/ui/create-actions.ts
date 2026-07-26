import type { ActionPopoverAction } from '@/components/ui/action-popover-item';

/**
 * The secondary rows shown in every ActionPopover.
 *
 * Disabled on purpose: none of these have a destination yet, and an enabled row
 * that silently does nothing reads as a bug rather than as a roadmap.
 */
export const CREATE_ACTIONS: ActionPopoverAction[] = [
  {
    icon: 'userPlus',
    title: 'Invite someone',
    subtitle: 'Share your household with a carer',
    isDisabled: true
  },
  {
    icon: 'pawPrint',
    title: 'Add a pet',
    subtitle: 'Set up another animal to track',
    isDisabled: true
  },
  {
    icon: 'calendar',
    title: 'Edit schedule',
    subtitle: 'Change feed times and portions',
    isDisabled: true
  }
];
