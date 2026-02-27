"use client";

import { useEffect } from "react";
import { useGraph } from "@/context/GraphContext";

/** Check if the active element is a text input (keyboard shortcuts should not fire). */
function isTextInput(): boolean {
	const el = document.activeElement;
	if (!el) return false;
	const tag = el.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if ((el as HTMLElement).isContentEditable) return true;
	return false;
}

/**
 * Global keyboard shortcut handler. Renders nothing — place inside GraphProvider.
 *
 * - Cmd+Z / Ctrl+Z → undo
 * - Cmd+Shift+Z / Ctrl+Shift+Z → redo
 * - Delete / Backspace → remove selected node or edge
 * - Escape → deselect all
 * - Cmd+Shift+D → toggle dev panel
 */
export default function KeyboardShortcuts() {
	const {
		state,
		dispatch,
		undo,
		redo,
		selectedNodeId,
		selectedEdgeId,
		setSelectedNodeId,
		setSelectedEdgeId,
	} = useGraph();

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey;

			// Undo: Cmd+Z (no shift)
			if (mod && !e.shiftKey && e.key === "z") {
				if (isTextInput()) return;
				e.preventDefault();
				undo();
				return;
			}

			// Redo: Cmd+Shift+Z
			if (mod && e.shiftKey && (e.key === "z" || e.key === "Z")) {
				if (isTextInput()) return;
				e.preventDefault();
				redo();
				return;
			}

			// Toggle dev panel: Cmd+Shift+D
			if (mod && e.shiftKey && (e.key === "d" || e.key === "D")) {
				e.preventDefault();
				const header = document.querySelector<HTMLElement>(".dialkit-panel-header");
				header?.click();
				return;
			}

			// Delete selected node or edge
			if (e.key === "Delete" || e.key === "Backspace") {
				if (isTextInput()) return;
				e.preventDefault();

				if (selectedNodeId) {
					const person = state.persons.find((p) => p.id === selectedNodeId);
					if (person && !person.isEgo) {
						dispatch({
							type: "REMOVE_PERSON",
							payload: { id: selectedNodeId },
						});
						setSelectedNodeId(null);
					}
				} else if (selectedEdgeId) {
					dispatch({
						type: "REMOVE_RELATIONSHIP",
						payload: { id: selectedEdgeId },
					});
					setSelectedEdgeId(null);
				}
				return;
			}

			// Escape: deselect
			if (e.key === "Escape") {
				setSelectedNodeId(null);
				setSelectedEdgeId(null);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		undo,
		redo,
		dispatch,
		state.persons,
		selectedNodeId,
		selectedEdgeId,
		setSelectedNodeId,
		setSelectedEdgeId,
	]);

	return null;
}
