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

export const buildHomeTiles = (petId: string | undefined): TileDescriptor[] =>
  petId
    ? [
        {
          id: 'pets',
          label: 'Pets',
          icon: 'pawPrint',
          span: 1,
          href: `/home/pet/${petId}`,
          art: 'petStack'
        }
      ]
    : [];
