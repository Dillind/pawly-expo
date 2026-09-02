import { supabase } from '@/lib/supabase/client';

/**
 * A household's Occasions. An emoji, a label, or both -- never neither, which
 * the `occasions_carry_something` constraint is the one that binds.
 */
export type Occasion = {
  id: string;
  householdId: string;
  emoji: string | null;
  label: string | null;
  sortOrder: number;
  /** Set means it has left the picker. The Posts carrying it keep it. */
  deletedAt: string | null;
};

type OccasionRow = {
  id: string;
  household_id: string;
  emoji: string | null;
  label: string | null;
  sort_order: number;
  deleted_at: string | null;
};

const mapRow = (row: OccasionRow): Occasion => ({
  id: row.id,
  householdId: row.household_id,
  emoji: row.emoji,
  label: row.label,
  sortOrder: row.sort_order,
  deletedAt: row.deleted_at
});

const SELECT = 'id, household_id, emoji, label, sort_order, deleted_at';

namespace OccasionService {
  /** The picker: live rows only, in the household's own order. */
  export async function list(householdId: string): Promise<Occasion[]> {
    const { data, error } = await supabase
      .from('occasions')
      .select(SELECT)
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data as OccasionRow[]).map(mapRow);
  }

  export async function create(params: {
    householdId: string;
    emoji: string | null;
    label: string | null;
  }): Promise<Occasion> {
    // The next slot, so a new Occasion lands at the end rather than jumping
    // into the middle of a set the household has already learnt.
    const { data: last } = await supabase
      .from('occasions')
      .select('sort_order')
      .eq('household_id', params.householdId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle<{ sort_order: number }>();

    const { data, error } = await supabase
      .from('occasions')
      .insert({
        household_id: params.householdId,
        emoji: params.emoji,
        label: params.label,
        sort_order: (last?.sort_order ?? -1) + 1
      })
      .select(SELECT)
      .single();

    if (error) throw error;

    return mapRow(data as OccasionRow);
  }

  export async function update(params: {
    id: string;
    emoji: string | null;
    label: string | null;
  }): Promise<void> {
    const { error } = await supabase
      .from('occasions')
      .update({ emoji: params.emoji, label: params.label })
      .eq('id', params.id);

    if (error) throw error;
  }

  /**
   * Soft, and there is no hard alternative -- `authenticated` holds no delete
   * grant on the table. A Post is a record of a day, so editing the picker must
   * never rewrite what an old Post said.
   */
  export async function remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('occasions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  /** What the remove alert names, because that is the fact the decision turns on. */
  export async function countPosts(id: string): Promise<number> {
    const { count, error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('occasion_id', id);

    if (error) throw error;

    return count ?? 0;
  }
}

export default OccasionService;
