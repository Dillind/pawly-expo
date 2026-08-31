import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import PostActionsSheet from '@/components/bottom-sheets/post-actions-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainLegendList from '@/components/core/main-legend-list';
import UserAvatar from '@/components/core/user-avatar';
import ScreenView from '@/components/layout/screen-view';
import ProfileStats from '@/components/screens/profile/profile-stats';
import PostCard from '@/components/ui/post-card';
import { ROLE_OPTIONS } from '@/constants/options';
import { BottomTabInset, Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useChangeProfilePhoto } from '@/hooks/queries/account/use-change-profile-photo';
import { useSessionEmail } from '@/hooks/queries/account/use-session-email';
import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import { useAuthorPosts, useDeletePost, useToggleLike } from '@/hooks/queries/posts/use-posts';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import type { Post } from '@/services/post.service';
import { useAuthStore } from '@/stores/auth-store';
import { fullName } from '@/utils/members';
import { optionLabel } from '@/utils/options';
import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const AVATAR = 96;
const PostGap = 12;

const ProfileOverview = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { userId } = useAuthStore();
  const { data: profile } = useUserProfile();
  const { data: email } = useSessionEmail();
  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();
  const { data: households = [] } = useHouseholds();

  const { mutate: changePhoto, isPending: isChangingPhoto } = useChangeProfilePhoto();
  const { mutate: toggleLike } = useToggleLike();
  const { mutate: deletePost } = useDeletePost();

  const photoSheetRef = useRef<TrueSheet | null>(null);
  const actionsSheetRef = useRef<TrueSheet | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);

  const {
    data: posts = [],
    isLoading: isLoadingPosts,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAuthorPosts(userId ?? undefined);

  useRefreshOnFocus(['posts', 'author', userId]);
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const isMultiHousehold = households.length > 1;

  const householdById = useMemo(
    () => new Map(households.map((entry) => [entry.id, entry])),
    [households]
  );

  const name = fullName(profile);
  const avatarUrl = profile?.avatarUrl ?? null;

  const header = (
    <View style={styles.header}>
      <View style={styles.identity}>
        <View>
          <UserAvatar
            firstName={profile?.firstName}
            lastName={profile?.lastName}
            avatarUrl={avatarUrl}
            size={AVATAR}
          />

          {isChangingPhoto && (
            <View style={styles.uploading}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}

          <View style={styles.editWell}>
            <IconButton
              name="camera"
              accessibilityLabel="Change your profile photo"
              variant="primary"
              size={18}
              isDisabled={isChangingPhoto}
              onPress={() => void photoSheetRef.current?.present()}
            />
          </View>
        </View>
        <AppText variant="header" size={22}>
          {name || 'Your profile'}
        </AppText>
        {email && (
          <AppText size={14} color="textSecondary">
            {email}
          </AppText>
        )}
        {household && (
          <View style={styles.rolePill}>
            <AppText size={12} color="primaryText">
              {optionLabel(ROLE_OPTIONS, household.role)}
            </AppText>
          </View>
        )}
      </View>

      <ProfileStats />

      {household && (
        <View style={styles.householdCard}>
          <Icon name="house" size={18} color="textSecondary" />
          <AppText size={16} numberOfLines={1} style={styles.householdName}>
            {household.name}
          </AppText>
          <AppText size={14} color="textSecondary">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </AppText>
        </View>
      )}

      {/* Quiet and grey, matching Hevy's "Workouts" label: the cards below are
          the content, and a bold heading competes with them. */}
      <AppText size={17} color="textSecondary">
        Posts
      </AppText>
    </View>
  );

  const renderItem = ({ item }: LegendListRenderItemProps<Post>) => {
    const openPost = () =>
      router.push({ pathname: '/posts/[postId]', params: { postId: item.id } });

    const openComments = () =>
      router.push({ pathname: '/posts/[postId]/comments', params: { postId: item.id } });

    return (
      <PostCard
        post={item}
        showActions
        householdName={isMultiHousehold ? householdById.get(item.householdId)?.name : undefined}
        commentCount={item.commentCount}
        onToggleLike={() => toggleLike({ postId: item.id, liked: item.likedByMe })}
        onOpenActions={() => {
          setActivePost(item);
          void actionsSheetRef.current?.present();
        }}
        onOpen={openPost}
        onOpenComments={openComments}
      />
    );
  };

  return (
    <ScreenView edges={[]}>
      <MainLegendList<Post>
        contentInsetAdjustmentBehavior="automatic"
        data={posts}
        isError={isError}
        onRetry={() => {
          void refetch();
        }}
        onLoadMore={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        isLoadingMore={isFetchingNextPage}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        keyExtractor={(post) => post.id}
        estimatedItemSize={640}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        // No empty state: a Member with no posts gets the heading and nothing
        // under it. An illustration and a call to action here only pad a screen
        // whose job is the identity block above.
        //
        // Not MainLegendList's `isLoading` either, which replaces the whole
        // list -- the identity block is already known and must not blink out
        // while the posts are on their way.
        ListEmptyComponent={
          isLoadingPosts ? <ActivityIndicator style={styles.postsLoader} /> : null
        }
        renderItem={renderItem}
      />

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        title="Change your photo"
        onPicked={([localUri]) => changePhoto({ localUri, previousUrl: avatarUrl })}
      />

      {/* Every post here is yours, so both actions always apply. */}
      <PostActionsSheet
        sheetRef={actionsSheetRef}
        canEdit
        canDelete
        onEdit={() => {
          if (activePost) {
            router.push({ pathname: '/posts/[postId]/edit', params: { postId: activePost.id } });
          }
        }}
        onDelete={() => {
          if (activePost) deletePost(activePost.id);
        }}
      />
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    // No gutter on the list: a PostCard is full-bleed, so the header carries
    // its own padding instead.
    listContent: {
      paddingBottom: BottomTabInset + spacing.four
    },
    header: {
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.three,
      gap: spacing.four
    },
    identity: {
      alignItems: 'center',
      gap: spacing.two
    },
    // Over the avatar rather than in the badge's place: the new photo is what
    // is loading, and a badge that vanishes reads as a button that broke.
    uploading: {
      position: 'absolute',
      width: AVATAR,
      height: AVATAR,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.full,
      // A scrim over an image, not a themed surface -- same as the carousel's.
      backgroundColor: 'rgba(0, 0, 0, 0.4)'
    },
    // The avatar circle is `primary` too, so the button needs a ring of page
    // background around it or the two greens merge into one blob.
    editWell: {
      position: 'absolute',
      right: -spacing.two,
      bottom: -spacing.two,
      padding: spacing.half,
      borderRadius: Radius.full,
      backgroundColor: colors.background
    },
    rolePill: {
      paddingHorizontal: spacing.two,
      paddingVertical: spacing.half,
      borderRadius: Radius.full,
      backgroundColor: colors.primaryMuted
    },
    householdCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    householdName: {
      flex: 1
    },
    separator: {
      height: PostGap,
      backgroundColor: colors.postDivider
    },
    postsLoader: {
      paddingVertical: spacing.four
    }
  });

export default ProfileOverview;
