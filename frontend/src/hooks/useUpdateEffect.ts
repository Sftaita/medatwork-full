import { useEffect, useRef, type DependencyList, type EffectCallback } from "react";

/**
 * Like useEffect but skips the first render — only fires on updates.
 */
export const useUpdateEffect = (effect: EffectCallback, dependencies: DependencyList = []) => {
  const isInitialMount = useRef(true);

  useEffect(
    () => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
      } else {
        return effect();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  );
};
