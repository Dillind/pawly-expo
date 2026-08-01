-- The missed-feed copy names the slot by label ("Bailey's dinner feed"), so two
-- dinners produce two identical, indistinguishable notifications. `custom` is
-- exempt because repeating is its entire purpose.

create unique index feeding_schedules_pet_label_idx
  on public.feeding_schedules (pet_id, label)
  where label <> 'custom';
