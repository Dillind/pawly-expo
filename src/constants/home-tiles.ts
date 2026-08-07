import type { TileDescriptor } from '@/components/ui/tile-grid';

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
