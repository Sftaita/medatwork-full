import { useState } from "react";

export type Density = "compact" | "normal" | "comfortable";

const CYCLE: Density[] = ["compact", "normal", "comfortable"];
const LS_KEY = "medatwork:table-density";

function readStored(): Density {
  const v = localStorage.getItem(LS_KEY);
  return CYCLE.includes(v as Density) ? (v as Density) : "normal";
}

export function useTableDensity() {
  const [density, setDensity] = useState<Density>(readStored);

  const cycleDensity = () => {
    setDensity((prev) => {
      const next = CYCLE[(CYCLE.indexOf(prev) + 1) % CYCLE.length];
      localStorage.setItem(LS_KEY, next);
      return next;
    });
  };

  return { density, cycleDensity };
}
