import type { IconName } from '@/constants/icon-map';

export type TileDescriptor = {
  id: string;
  label: string;
  subtitle?: string;
  icon: IconName;
  span: 1 | 2;
  href: string;
};

/** The Pets tile manages the set of pets. Opening one goes through its row on Home. */
export const HOME_TILES: TileDescriptor[] = [
  {
    id: 'pets',
    label: 'Pets',
    subtitle: 'Pet management',
    icon: 'pawPrint',
    span: 1,
    href: '/home/pets'
  }
];
