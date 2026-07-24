import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const TIMING_MS = 280;

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
  const themedStyles = useThemedStyles((colors) => ({
    headerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textSecondary
    }
  }));
  const { openId, setOpenId } = useAccordionContext();
  const isOpen = openId === id;

  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(0);
  const rotation = useSharedValue(isOpen ? 0 : -90);

  const onHeaderPress = useCallback(() => {
    setOpenId(isOpen ? null : id);
  }, [id, isOpen, setOpenId]);

  useEffect(() => {
    rotation.value = withTiming(isOpen ? 0 : -90, { duration: TIMING_MS });
  }, [isOpen, rotation]);

  useEffect(() => {
    if (isOpen) {
      if (contentHeight > 0) {
        animatedHeight.value = withTiming(contentHeight, { duration: TIMING_MS });
      }
    } else {
      animatedHeight.value = withTiming(0, { duration: TIMING_MS });
    }
  }, [isOpen, contentHeight, animatedHeight]);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setContentHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
    }
  }, []);

  const bodyStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden'
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }]
  }));

  return (
    <View style={layoutStyles.item}>
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
      <View style={themedStyles.headerRule} />
      <View style={layoutStyles.bodyContainer}>
        <View
          pointerEvents="none"
          collapsable={false}
          style={layoutStyles.measureLayer}
          onLayout={onContentLayout}>
          <View style={layoutStyles.bodyInner}>{children}</View>
        </View>
        <Animated.View style={[bodyStyle, layoutStyles.bodyAnimated]}>
          <View style={layoutStyles.bodyInner}>{children}</View>
        </Animated.View>
      </View>
    </View>
  );
};

type AccordionBulletRowProps = {
  label: string;
  isLast?: boolean;
};

export const AccordionBulletRow = ({ label, isLast = false }: AccordionBulletRowProps) => {
  const themedStyles = useThemedStyles((colors) => ({
    rowRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textSecondary,
      marginLeft: 8
    }
  }));

  return (
    <View>
      <View style={layoutStyles.bulletRow}>
        <Icon name="dot" size={4} />
        <AppText variant="body" size={14} color="text" style={layoutStyles.bulletLabel}>
          {label}
        </AppText>
      </View>
      {!isLast ? <View style={themedStyles.rowRule} /> : null}
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
  bodyContainer: {
    position: 'relative'
  },
  measureLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
    zIndex: 0
  },
  bodyAnimated: {
    zIndex: 1
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
