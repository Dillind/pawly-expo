import type { FeatureRequestSort } from '@/services/feature-request.service';

type Id = string | undefined;

// Every key is a prefix of the keys below it, so invalidating a parent refreshes its children.
export const queryKeys = {
  profile: (userId: Id) => ['profile', userId] as const,
  sessionEmail: (userId: Id) => ['session-email', userId] as const,
  signInMethod: (userId: Id) => ['sign-in-method', userId] as const,
  accountDeletionPlan: (userId: Id) => ['account-deletion-plan', userId] as const,
  userStats: {
    all: ['user-stats'] as const,
    of: (userId: Id) => ['user-stats', userId] as const
  },

  alerts: (householdId: Id) => ['alerts', householdId] as const,
  unreadAlerts: (householdId: Id) => ['alerts-unread', householdId] as const,
  notificationPermission: ['notification-permission'] as const,

  featureRequests: {
    all: ['feature-requests'] as const,
    lists: ['feature-requests', 'list'] as const,
    list: (sort: FeatureRequestSort, reportedOnly: boolean) =>
      ['feature-requests', 'list', sort, reportedOnly] as const,
    detail: (requestId: Id) => ['feature-requests', 'detail', requestId] as const,
    reportedCount: ['feature-requests', 'reported-count'] as const,
    isTeam: ['crumpet-team'] as const,
    isBanned: ['feature-board-banned'] as const
  },

  occurrences: {
    all: ['occurrences'] as const,
    pet: (petId: Id) => ['occurrences', petId] as const,
    day: (petId: Id, day: Id) => ['occurrences', petId, day] as const,
    offSchedule: (petId: Id, day: Id) => ['occurrences', petId, 'off-schedule', day] as const
  },
  feedTimes: (petId: Id) => ['feed-times', petId] as const,
  feedLog: (logId: Id) => ['feed-log', logId] as const,
  petPause: {
    pet: (petId: Id) => ['pet-pause', petId] as const,
    day: (petId: Id, day: Id) => ['pet-pause', petId, day] as const
  },

  follow: {
    following: ['following'] as const,
    preview: (householdId: Id) => ['follow-preview', householdId] as const,
    followers: (householdId: Id) => ['followers', householdId] as const,
    requests: (householdId: Id) => ['follow-requests', householdId] as const,
    requestSummary: (householdId: Id) => ['follow-requests', householdId, 'summary'] as const,
    searchAll: ['household-search'] as const,
    search: (term: string) => ['household-search', term] as const
  },

  households: {
    all: ['households'] as const,
    of: (userId: Id) => ['households', userId] as const
  },
  householdMembers: {
    all: ['household-members'] as const,
    of: (householdId: Id) => ['household-members', householdId] as const
  },
  notificationPreferences: (householdId: Id, userId: Id) =>
    ['notification-preferences', householdId, userId] as const,
  householdIsPro: (householdId: Id) => ['household', 'pro', householdId] as const,
  handleAvailable: (candidate: Id) => ['handle-available', candidate] as const,
  handleSuggestions: (stem: Id) => ['handle-suggestions', stem] as const,
  invitePreview: (code: Id) => ['invite-preview', code] as const,
  pendingInvites: (householdId: Id) => ['invites-pending', householdId] as const,

  petDetail: (petId: Id) => ['pet-detail', petId] as const,
  petPhotos: (petId: Id) => ['pet-photos', petId] as const,
  careCard: (petId: Id) => ['care-card', petId] as const,

  posts: {
    all: ['posts'] as const,
    feed: (householdIds: string[]) => ['posts', [...householdIds].sort()] as const,
    byAuthor: (authorId: Id) => ['posts', 'author', authorId] as const
  },
  post: {
    all: ['post'] as const,
    detail: (postId: Id) => ['post', postId] as const
  },
  unseenPosts: {
    all: ['posts-unseen'] as const,
    of: (householdId: Id) => ['posts-unseen', householdId] as const
  },
  comments: (postId: Id) => ['comments', postId] as const,
  occasions: (householdId: Id) => ['occasions', householdId] as const,

  reminders: {
    all: ['reminders'] as const,
    day: (petId: Id, day: Id) => ['reminders', petId, day] as const,
    range: (petId: Id, fromDate: Id, toDate: Id) => ['reminders', petId, fromDate, toDate] as const
  },
  reminderDays: {
    all: ['reminder-days'] as const,
    range: (householdId: Id, fromDate: Id, toDate: Id) =>
      ['reminder-days', householdId, fromDate, toDate] as const
  },

  travel: {
    all: ['travel'] as const,
    list: (householdId: Id) => ['travel', 'list', householdId] as const,
    detail: (checklistId: Id) => ['travel', 'checklist', checklistId] as const
  }
};
