import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import Divider from '@/components/core/divider';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Spacing } from '@/constants/theme';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

const TIMING_MS = 280;

const Reflow = LinearTransition.duration(TIMING_MS).reduceMotion(ReduceMotion.System);
const BodyIn = FadeIn.duration(TIMING_MS).reduceMotion(ReduceMotion.System);
const BodyOut = FadeOut.duration(TIMING_MS / 2).reduceMotion(ReduceMotion.System);

type AccordionContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

const useAccordionContext = () => {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error('AccordionItem must be rendered inside AccordionGroup');
  }
  return ctx;
};

type AccordionGroupProps = {
  children: React.ReactNode;
  initialOpenId?: string | null;
};

export const AccordionGroup = ({ children, initialOpenId = null }: AccordionGroupProps) => {
  const [openId, setOpenId] = useState<string | null>(initialOpenId);

  const value = useMemo(() => ({ openId, setOpenId }), [openId]);

  return (
    <AccordionContext.Provider value={value}>
      <View style={layoutStyles.group}>{children}</View>
    </AccordionContext.Provider>
  );
};

type AccordionItemProps = {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

export const AccordionItem = ({ id, title, icon, children }: AccordionItemProps) => {
  const { openId, setOpenId } = useAccordionContext();
  const isOpen = openId === id;

  const rotation = useSharedValue(isOpen ? 0 : -90);

  const onHeaderPress = useCallback(() => {
    setOpenId(isOpen ? null : id);
  }, [id, isOpen, setOpenId]);

  useEffect(() => {
    rotation.set(withTiming(isOpen ? 0 : -90, { duration: TIMING_MS }));
  }, [isOpen, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }]
  }));

  return (
    <Animated.View layout={Reflow} style={layoutStyles.item}>
      <PressableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={title}
        onPress={onHeaderPress}
        style={layoutStyles.header}>
        <View style={layoutStyles.headerLeading}>
          <View style={layoutStyles.iconWrap}>{icon}</View>
          <AppText variant="body" color="text">
            {title}
          </AppText>
        </View>
        <Animated.View style={chevronStyle}>
          <Icon name="caretDown" size={10} />
        </Animated.View>
      </PressableOpacity>
      <Divider />
      {isOpen ? (
        <Animated.View entering={BodyIn} exiting={BodyOut} style={layoutStyles.bodyInner}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

type AccordionBulletRowProps = {
  label: string;
  isLast?: boolean;
};

export const AccordionBulletRow = ({ label, isLast = false }: AccordionBulletRowProps) => {
  return (
    <View>
      <View style={layoutStyles.bulletRow}>
        <Icon name="dot" size={4} />
        <AppText variant="body" size={14} color="text" style={layoutStyles.bulletLabel}>
          {label}
        </AppText>
      </View>
      {!isLast ? <Divider inset={Spacing.two} /> : null}
    </View>
  );
};

const layoutStyles = StyleSheet.create({
  group: {
    gap: 0
  },
  item: {
    overflow: 'visible'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4
  },
  headerLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8
  },
  iconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bodyInner: {
    paddingBottom: 4
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    paddingLeft: 8
  },
  bulletLabel: {
    flex: 1
  }
});
