"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { stripPhysicsState } from "@/lib/graph-constants";
import {
	createInitialState,
	type GraphAction,
	graphReducer,
} from "@/lib/graph-reducer";
import { loadGraph } from "@/lib/persistence";
import type { SocialGraph } from "@/types/graph";

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

const MAX_UNDO_STEPS = 50;

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface GraphContextValue {
	state: SocialGraph;
	dispatch: (action: GraphAction) => void;
	batchDispatch: (actions: GraphAction[]) => void;
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
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

/** Actions that don't mutate graph data — no snapshot needed. */
const NON_MUTATING_ACTIONS = new Set(["SET_ACTIVE_COHORT"]);

export function GraphProvider({ children }: { children: ReactNode }) {
	const [state, rawDispatch] = useReducer(graphReducer, undefined, initState);
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

	// Undo/redo stacks stored as refs — version counter drives re-renders
	const undoStackRef = useRef<SocialGraph[]>([]);
	const redoStackRef = useRef<SocialGraph[]>([]);
	const [_undoRedoVersion, setUndoRedoVersion] = useState(0);

	// We need access to the current state in callbacks without stale closures.
	// useReducer's state is always fresh at render time, but callbacks capture
	// the render-time value. We use a ref that's updated each render.
	const stateRef = useRef(state);
	stateRef.current = state;

	const pushUndo = useCallback((snapshot: SocialGraph) => {
		const stack = undoStackRef.current;
		stack.push(snapshot);
		if (stack.length > MAX_UNDO_STEPS) {
			stack.shift();
		}
		redoStackRef.current = [];
		setUndoRedoVersion((v) => v + 1);
	}, []);

	// Dispatch with auto-snapshot (one undo entry per action)
	const dispatch = useCallback(
		(action: GraphAction) => {
			if (!NON_MUTATING_ACTIONS.has(action.type)) {
				pushUndo(stripPhysicsState(stateRef.current));
			}
			rawDispatch(action);
		},
		[pushUndo],
	);

	// Batch dispatch: all actions = one undo entry (for NL operations)
	const batchDispatch = useCallback(
		(actions: GraphAction[]) => {
			if (actions.length === 0) return;
			const hasMutation = actions.some(
				(a) => !NON_MUTATING_ACTIONS.has(a.type),
			);
			if (hasMutation) {
				pushUndo(stripPhysicsState(stateRef.current));
			}
			for (const action of actions) {
				rawDispatch(action);
			}
		},
		[pushUndo],
	);

	const undo = useCallback(() => {
		const stack = undoStackRef.current;
		if (stack.length === 0) return;
		const snapshot = stack[stack.length - 1];
		stack.length -= 1;
		redoStackRef.current.push(stripPhysicsState(stateRef.current));
		rawDispatch({ type: "RESTORE_SNAPSHOT", payload: snapshot });
		setUndoRedoVersion((v) => v + 1);
	}, []);

	const redo = useCallback(() => {
		const stack = redoStackRef.current;
		if (stack.length === 0) return;
		const snapshot = stack[stack.length - 1];
		stack.length -= 1;
		undoStackRef.current.push(stripPhysicsState(stateRef.current));
		rawDispatch({ type: "RESTORE_SNAPSHOT", payload: snapshot });
		setUndoRedoVersion((v) => v + 1);
	}, []);

	useAutoSave(state);

	const canUndo = undoStackRef.current.length > 0;
	const canRedo = redoStackRef.current.length > 0;

	const value = useMemo<GraphContextValue>(
		() => ({
			state,
			dispatch,
			batchDispatch,
			undo,
			redo,
			canUndo,
			canRedo,
			selectedNodeId,
			selectedEdgeId,
			setSelectedNodeId,
			setSelectedEdgeId,
		}),
		[
			state,
			dispatch,
			batchDispatch,
			undo,
			redo,
			canUndo,
			canRedo,
			selectedNodeId,
			selectedEdgeId,
		],
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
