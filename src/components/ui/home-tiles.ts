import type { IconName } from '@/constants/icon-map';

export type TileDescriptor = {
  id: string;
  label: string;
  icon: IconName;
  span: 1 | 2;
  href: string;
};

export const buildHomeTiles = (petId: string | undefined): TileDescriptor[] =>
  petId ? [{ id: 'pets', label: 'Pets', icon: 'pawPrint', span: 1, href: `/home/pet/${petId}` }] : [];
