import { supabase } from '@/lib/supabase/client';
import { packedAt } from '@/lib/travel-packing';

export type ChecklistItem = {
  id: string;
  checklistId: string;
  text: string;
  emoji: string | null;
  petId: string | null;
  sortOrder: number;
  isTicked: boolean;
  tickedBy: string | null;
  tickedAt: string | null;
  createdAt: string;
};

export type TravelChecklist = {
  id: string;
  householdId: string;
  name: string;
  emoji: string | null;
  itemCount: number;
  tickedCount: number;
  packedAt: string | null;
};

export type TravelChecklistDetail = Omit<
  TravelChecklist,
  'itemCount' | 'tickedCount' | 'packedAt'
> & {
  items: ChecklistItem[];
};

type CreateChecklistResult =
  { status: 'created'; checklist: TravelChecklist } | { status: 'cap_reached' };

type ItemRow = {
  id: string;
  checklist_id: string;
  text: string;
  emoji: string | null;
  pet_id: string | null;
  sort_order: number;
  is_ticked: boolean;
  ticked_by: string | null;
  ticked_at: string | null;
  created_at: string;
};

type ChecklistRow = {
  id: string;
  household_id: string;
  name: string;
  emoji: string | null;
  travel_checklist_items: Pick<ItemRow, 'is_ticked' | 'ticked_at'>[];
};

type ChecklistDetailRow = Omit<ChecklistRow, 'travel_checklist_items'> & {
  travel_checklist_items: ItemRow[];
};

const ITEM_SELECT =
  'id, checklist_id, text, emoji, pet_id, sort_order, is_ticked, ticked_by, ticked_at, created_at';
const LIST_SELECT = `id, household_id, name, emoji, travel_checklist_items (is_ticked, ticked_at)`;
const DETAIL_SELECT = `id, household_id, name, emoji, travel_checklist_items (${ITEM_SELECT})`;

const CAP_REACHED = 'checklist_cap_reached';

const mapItem = (row: ItemRow): ChecklistItem => ({
  id: row.id,
  checklistId: row.checklist_id,
  text: row.text,
  emoji: row.emoji,
  petId: row.pet_id,
  sortOrder: row.sort_order,
  isTicked: row.is_ticked,
  tickedBy: row.ticked_by,
  tickedAt: row.ticked_at,
  createdAt: row.created_at
});

const mapChecklist = (row: ChecklistRow): TravelChecklist => ({
  id: row.id,
  householdId: row.household_id,
  name: row.name,
  emoji: row.emoji,
  itemCount: row.travel_checklist_items.length,
  tickedCount: row.travel_checklist_items.filter((item) => item.is_ticked).length,
  packedAt: packedAt(
    row.travel_checklist_items.map((item) => ({
      isTicked: item.is_ticked,
      tickedAt: item.ticked_at
    }))
  )
});

// Two devices can hand out the same sort_order; the tie-break keeps one order.
const byOrder = (a: ChecklistItem, b: ChecklistItem) =>
  a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

const isCapError = (error: { message?: string } | null) =>
  Boolean(error?.message?.includes(CAP_REACHED));

namespace TravelChecklistService {
  export async function list(householdId: string): Promise<TravelChecklist[]> {
    const { data, error } = await supabase
      .from('travel_checklists')
      .select(LIST_SELECT)
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data as ChecklistRow[]).map(mapChecklist);
  }

  export async function get(checklistId: string): Promise<TravelChecklistDetail> {
    const { data, error } = await supabase
      .from('travel_checklists')
      .select(DETAIL_SELECT)
      .eq('id', checklistId)
      .single<ChecklistDetailRow>();

    if (error) throw error;

    return {
      id: data.id,
      householdId: data.household_id,
      name: data.name,
      emoji: data.emoji,
      items: data.travel_checklist_items.map(mapItem).sort(byOrder)
    };
  }

  export async function create(params: {
    householdId: string;
    name: string;
    emoji: string | null;
  }): Promise<CreateChecklistResult> {
    const { data, error } = await supabase
      .from('travel_checklists')
      .insert({
        household_id: params.householdId,
        name: params.name.trim(),
        emoji: params.emoji
      })
      .select(LIST_SELECT)
      .single<ChecklistRow>();

    if (isCapError(error)) return { status: 'cap_reached' };
    if (error) throw error;

    return { status: 'created', checklist: mapChecklist(data) };
  }

  export async function rename(params: {
    checklistId: string;
    name: string;
    emoji: string | null;
  }): Promise<void> {
    const { error } = await supabase
      .from('travel_checklists')
      .update({ name: params.name.trim(), emoji: params.emoji })
      .eq('id', params.checklistId);

    if (error) throw error;
  }

  export async function remove(checklistId: string): Promise<void> {
    const { error } = await supabase.from('travel_checklists').delete().eq('id', checklistId);

    if (error) throw error;
  }

  export async function addItem(params: {
    checklistId: string;
    text: string;
    sortOrder: number;
  }): Promise<ChecklistItem> {
    const { data, error } = await supabase
      .from('travel_checklist_items')
      .insert({
        checklist_id: params.checklistId,
        text: params.text.trim(),
        sort_order: params.sortOrder
      })
      .select(ITEM_SELECT)
      .single<ItemRow>();

    if (error) throw error;

    return mapItem(data);
  }

  export async function updateItem(params: {
    itemId: string;
    text?: string;
    emoji?: string | null;
    petId?: string | null;
  }): Promise<void> {
    const patch: Partial<Pick<ItemRow, 'text' | 'emoji' | 'pet_id'>> = {};
    if (params.text !== undefined) patch.text = params.text.trim();
    if (params.emoji !== undefined) patch.emoji = params.emoji;
    if (params.petId !== undefined) patch.pet_id = params.petId;

    const { error } = await supabase
      .from('travel_checklist_items')
      .update(patch)
      .eq('id', params.itemId);

    if (error) throw error;
  }

  export async function removeItem(itemId: string): Promise<void> {
    const { error } = await supabase.from('travel_checklist_items').delete().eq('id', itemId);

    if (error) throw error;
  }

  export async function tick(params: { itemId: string; isTicked: boolean }): Promise<void> {
    const { error } = await supabase
      .from('travel_checklist_items')
      .update({ is_ticked: params.isTicked })
      .eq('id', params.itemId);

    if (error) throw error;
  }

  export async function reset(checklistId: string): Promise<void> {
    const { error } = await supabase.rpc('reset_travel_checklist', {
      target_checklist_id: checklistId
    });

    if (error) throw error;
  }

  export async function isHouseholdPro(householdId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_household_pro', {
      target_household_id: householdId
    });

    if (error) throw error;

    return Boolean(data);
  }
}

export default TravelChecklistService;
