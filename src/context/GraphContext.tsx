"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useReducer,
	useState,
} from "react";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
	createInitialState,
	type GraphAction,
	graphReducer,
} from "@/lib/graph-reducer";
import { loadGraph } from "@/lib/persistence";
import type { SocialGraph } from "@/types/graph";

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

function initState(): SocialGraph {
	return loadGraph() ?? createInitialState();
}

export function GraphProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(graphReducer, undefined, initState);
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

	useAutoSave(state);

	const value = useMemo<GraphContextValue>(
		() => ({
			state,
			dispatch,
			selectedNodeId,
			selectedEdgeId,
			setSelectedNodeId,
			setSelectedEdgeId,
		}),
		[state, selectedNodeId, selectedEdgeId],
	);

	return (
		<GraphContext.Provider value={value}>{children}</GraphContext.Provider>
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
