-- Six things every pet-sitter checklist asks for that the Care Card had nowhere
-- to put. Without these they end up crammed into `notes`, where a sitter has to
-- read a paragraph to find the one line that matters.
--
-- Still a handover document, not a medical record (CONTEXT.md): none of these
-- are dated clinical history. `return_date` is deliberately absent -- when the
-- owner comes back belongs to a stay, not to a pet.

alter table public.care_cards
  add column behaviour_notes text,
  add column walk_routine text,
  add column owner_phone text,
  add column backup_contact_name text,
  add column backup_contact_phone text,
  add column where_things_are text;

-- RLS, grants and the updated_at trigger are inherited from the table and need
-- no reapplying -- policies are per-table, not per-column.
