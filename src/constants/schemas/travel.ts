import { z } from 'zod';

// Match the check constraints on `travel_checklists.name` and
// `travel_checklist_items.text`, so the form errors inline first.
export const CHECKLIST_NAME_MAX = 60;
export const CHECKLIST_ITEM_MAX = 120;

export const checklistNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the checklist a name')
    .max(CHECKLIST_NAME_MAX, `Keep it under ${CHECKLIST_NAME_MAX} characters`)
});

export type ChecklistNameInput = z.infer<typeof checklistNameSchema>;
