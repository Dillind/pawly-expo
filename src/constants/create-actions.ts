import type { ActionPopoverAction } from '@/components/ui/action-popover-item';

export const CREATE_ACTIONS: ActionPopoverAction[] = [
  {
    icon: 'userPlus',
    title: 'Invite someone',
    subtitle: 'Share your household with a carer',
    href: '/profile/settings/invite'
  },
  {
    icon: 'pawPrint',
    title: 'Add a pet',
    subtitle: 'Set up another pet to track',
    href: '/home/add-pet'
  },
  {
    icon: 'calendar',
    title: 'Edit schedule',
    subtitle: 'Change feed times and portions',
    isDisabled: true
  }
];
