import type { TileArt } from '@/components/ui/tile-art';
import type { IconName } from '@/constants/icon-map';

export type TileDescriptor = {
  id: string;
  label: string;
  icon: IconName;
  span: 1 | 2;
  href: string;
  art?: TileArt;
};

/**
 * The Pets tile manages the set of pets. Opening one goes through its section
 * header on Home instead, which is why this no longer needs a pet's id.
 */
export const HOME_TILES: TileDescriptor[] = [
  {
    id: 'pets',
    label: 'Pets',
    icon: 'pawPrint',
    span: 1,
    href: '/home/pets',
    art: 'petStack'
  }
];
