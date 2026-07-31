import BaseSheet from '@/components/bottom-sheets/base-sheet';
import TrayStep from '@/components/core/tray-step';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

export type TrayStepDescriptor = {
  id: string;
  title: string;
  render: () => ReactNode;
};

type TrayControls = {
  goTo: (stepId: string) => void;
  back: () => void;
  close: () => void;
};

const TrayContext = createContext<TrayControls | null>(null);

export const useTray = (): TrayControls => {
  const controls = useContext(TrayContext);
  if (!controls) throw new Error('useTray must be used inside a Tray');
  return controls;
};

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  steps: TrayStepDescriptor[];
  onDismiss?: () => void;
};

const Tray = ({ sheetRef, steps, onDismiss }: Props) => {
  const [history, setHistory] = useState<string[]>([]);

  const activeId = history[history.length - 1] ?? steps[0]?.id;
  const active = steps.find((step) => step.id === activeId) ?? steps[0];

  const close = useCallback(() => {
    void sheetRef.current?.dismiss();
  }, [sheetRef]);

  // 'auto' re-measures the swapped content, which is what animates the height
  // between steps. Nested sheets are not an option -- iOS handles a modal
  // stacked on a native sheet badly (AGENTS.md, ADR 0010).
  const resize = useCallback(() => {
    void sheetRef.current?.resize(0);
  }, [sheetRef]);

  const controls = useMemo<TrayControls>(
    () => ({
      goTo: (stepId) => {
        setHistory((current) => [...current, stepId]);
        resize();
      },
      back: () => {
        setHistory((current) => current.slice(0, -1));
        resize();
      },
      close
    }),
    [close, resize]
  );

  const handleDismiss = useCallback(() => {
    setHistory([]);
    onDismiss?.();
  }, [onDismiss]);

  if (!active) return null;

  return (
    <TrayContext.Provider value={controls}>
      <BaseSheet sheetRef={sheetRef} detents={['auto']} onDismiss={handleDismiss}>
        <TrayStep
          title={active.title}
          isFirst={history.length <= 1}
          onBack={controls.back}
          onClose={close}>
          {active.render()}
        </TrayStep>
      </BaseSheet>
    </TrayContext.Provider>
  );
};

export default Tray;
