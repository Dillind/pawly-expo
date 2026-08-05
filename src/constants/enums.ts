export enum MessageType {
  Sent = 'Successfully sent',
  Resent = 'Successfully resent',
  Updated = 'Successfully updated',
  Created = 'Successfully created',
  Deleted = 'Successfully deleted',
  Purchased = 'Successfully purchased',
  Restored = 'Successfully restored',
  Verified = 'Successfully verified',
  Added = 'Successfully added',
  Submitted = 'Successfully submitted',
  Invited = 'Successfully invited',
  Accepted = 'Successfully accepted',
  SignOutSuccess = 'Successfully signed out',
  SignOutError = 'Failed to sign out'
}

/**
 * Every toast the app can show, named by subject and outcome.
 *
 * Shape is "<Subject> <past-tense verb>" so five near-identical trays on the
 * pet screen do not all confirm with the same sentence -- the toast is the only
 * thing that tells a member which sheet they just saved.
 */
export enum SuccessMessage {
  BioUpdated = 'Bio updated',
  CareCardUpdated = 'Care Card updated',
  CoverPhotoUpdated = 'Cover photo updated',
  FeedDeleted = 'Feed deleted',
  FeedLoggedAlertsOff = 'Feed Logged Alerts off',
  FeedLoggedAlertsOn = 'Feed Logged Alerts on',
  FeedTimeAdded = 'Feed time added',
  FeedTimeRemoved = 'Feed time removed',
  FeedTimeUpdated = 'Feed time updated',
  FeedUpdated = 'Feed updated',
  MedicationAdded = 'Medication added',
  MedicationRemoved = 'Medication removed',
  MedicationUpdated = 'Medication updated',
  OnboardingCompleted = 'Pet profile completed',
  PetDetailsUpdated = 'Pet details updated',
  PetPhotoUpdated = 'Photo updated',
  PhotoAdded = 'Photo added',
  PhotoDeleted = 'Photo deleted',
  PhotosAdded = 'Photos added',
  SignedIn = 'Signed in',
  SignedOut = 'Signed out'
}

/**
 * Failures the user can do something about. Never carries a raw Postgres or
 * Supabase string -- those are written for developers.
 */
export enum ErrorMessage {
  BioUpdateFailed = 'Could not update bio',
  CameraAccessDenied = 'Allow camera access in Settings to take a photo',
  CareCardUpdateFailed = 'Could not update the Care Card',
  CoverPhotoUpdateFailed = 'Could not set the cover photo',
  FeedTimeRemoveFailed = 'Could not remove the feed time',
  FeedTimeSaveFailed = 'Could not save the feed time',
  MedicationRemoveFailed = 'Could not remove the medication',
  MedicationSaveFailed = 'Could not save the medication',
  MissingPetDetails = 'Missing pet details, go back and try again',
  NotificationSettingsUpdateFailed = 'Could not update notification settings',
  OnboardingFailed = 'Could not finish setup',
  PetDetailsUpdateFailed = 'Could not update pet details',
  PetPhotoUpdateFailed = 'Could not change the photo',
  PhotoAddFailed = 'Could not add the photo',
  PhotoDeleteFailed = 'Could not delete the photo',
  PhotosAddFailed = 'Could not add all of the photos',
  SignInFailed = 'Could not sign in',
  SignOutFailed = 'Failed to sign out',
  SignUpFailed = 'Could not sign up',
  VerificationFailed = 'Could not verify code'
}
