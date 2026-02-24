"use client";

import {
  createContext,
  useContext,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { SocialGraph } from "@/types/graph";
import {
  graphReducer,
  createInitialState,
  type GraphAction,
} from "@/lib/graph-reducer";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface GraphContextValue {
  state: SocialGraph;
  dispatch: React.Dispatch<GraphAction>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
}

const GraphContext = createContext<GraphContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GraphProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(graphReducer, undefined, createInitialState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  return (
    <GraphContext.Provider
      value={{
        state,
        dispatch,
        selectedNodeId,
        selectedEdgeId,
        setSelectedNodeId,
        setSelectedEdgeId,
      }}
    >
      {children}
    </GraphContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGraph(): GraphContextValue {
  const ctx = useContext(GraphContext);
  if (ctx === null) {
    throw new Error("useGraph must be used within a <GraphProvider>");
  }
  return ctx;
}
