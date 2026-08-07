import BaseSheet from '@/components/bottom-sheets/base-sheet';
import TrayStep from '@/components/core/tray-step';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

export type TrayStepDescriptor = {
  id: string;
  title: string;
  /** Replaces the title text in the header. `title` is still what assistive tech reads. */
  header?: () => ReactNode;
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
  /** Renders inside the context but outside the sheet — navigation effects only. */
  children?: ReactNode;
};

const Tray = ({ sheetRef, steps, onDismiss, children }: Props) => {
  const [history, setHistory] = useState<string[]>([]);
  const [isPresented, setIsPresented] = useState(false);

  const activeId = history[history.length - 1] ?? steps[0]?.id;
  const active = steps.find((step) => step.id === activeId) ?? steps[0];

  const close = useCallback(() => {
    void sheetRef.current?.dismiss();
  }, [sheetRef]);

  const controls = useMemo<TrayControls>(
    () => ({
      goTo: (stepId) => {
        setHistory((current) => [...current, stepId]);
      },
      back: () => {
        setHistory((current) => current.slice(0, -1));
      },
      close
    }),
    [close]
  );

  const handlePresent = useCallback(() => {
    setIsPresented(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsPresented(false);
    setHistory([]);
    onDismiss?.();
  }, [onDismiss]);

  // setHistory is async, so a resize called inline from goTo/back would measure
  // the outgoing step -- run it here, after the new step has rendered. Resizing
  // before the sheet is presented rejects with "No sheet found with tag N".
  useEffect(() => {
    if (!isPresented) return;
    // Index 0: detents={['auto']} on BaseSheet below has exactly one entry.
    void sheetRef.current?.resize(0);
  }, [activeId, isPresented, sheetRef]);

  if (!active) return null;

  return (
    <TrayContext.Provider value={controls}>
      {children}
      <BaseSheet
        sheetRef={sheetRef}
        detents={['auto']}
        onDismiss={handleDismiss}
        onPresent={handlePresent}>
        <TrayStep
          title={active.title}
          header={active.header}
          isFirst={history.length === 0}
          onBack={controls.back}
          onClose={close}>
          {active.render()}
        </TrayStep>
      </BaseSheet>
    </TrayContext.Provider>
  );
};

export default Tray;
