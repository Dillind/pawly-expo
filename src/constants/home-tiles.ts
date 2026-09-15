import type { TileDescriptor } from '@/components/ui/tile-grid';

// A tile is a promise of content, so only real destinations go in it. The grid
// stays at two until History and Statistics exist as screens.
export const homeTiles = (householdId: string | undefined): TileDescriptor[] => [
  {
    id: 'pets',
    label: 'Pets',
    icon: 'pawPrint',
    span: 1,
    href: '/home/pets'
  },
  ...(householdId
    ? [
        {
          id: 'household',
          label: 'Household',
          icon: 'house',
          span: 1,
          href: `/home/household/${householdId}`
        } as TileDescriptor
      ]
    : [])
];
