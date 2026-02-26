"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useGraph } from "@/context/GraphContext";

interface ContextMenuProps {
	x: number;
	y: number;
	nodeId: string | null;
	edgeId: string | null;
	onClose: () => void;
}

const MENU_WIDTH = 160;
const MENU_PADDING = 8;

export default function ContextMenu({
	x,
	y,
	nodeId,
	edgeId,
	onClose,
}: ContextMenuProps) {
	const { state, dispatch, setSelectedNodeId, setSelectedEdgeId } = useGraph();
	const menuRef = useRef<HTMLDivElement>(null);

	// Close on click outside
	useEffect(() => {
		function handlePointerDown(e: PointerEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		}

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose();
			}
		}

		function handleScroll() {
			onClose();
		}

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		window.addEventListener("scroll", handleScroll, true);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("scroll", handleScroll, true);
		};
	}, [onClose]);

	const handleEditNode = useCallback(() => {
		if (nodeId) {
			setSelectedEdgeId(null);
			setSelectedNodeId(nodeId);
		}
		onClose();
	}, [nodeId, setSelectedNodeId, setSelectedEdgeId, onClose]);

	const handleDeleteNode = useCallback(() => {
		if (nodeId) {
			dispatch({ type: "REMOVE_PERSON", payload: { id: nodeId } });
			setSelectedNodeId(null);
			setSelectedEdgeId(null);
		}
		onClose();
	}, [nodeId, dispatch, setSelectedNodeId, setSelectedEdgeId, onClose]);

	const handleEditEdge = useCallback(() => {
		if (edgeId) {
			setSelectedNodeId(null);
			setSelectedEdgeId(edgeId);
		}
		onClose();
	}, [edgeId, setSelectedNodeId, setSelectedEdgeId, onClose]);

	const handleDeleteEdge = useCallback(() => {
		if (edgeId) {
			dispatch({ type: "REMOVE_RELATIONSHIP", payload: { id: edgeId } });
			setSelectedEdgeId(null);
			setSelectedNodeId(null);
		}
		onClose();
	}, [edgeId, dispatch, setSelectedEdgeId, setSelectedNodeId, onClose]);

	// Nothing to show when right-clicking empty canvas
	if (!nodeId && !edgeId) return null;

	// Viewport boundary clamping
	const menuHeight = nodeId ? 80 : 80; // approximate: 2 items * ~36px + padding
	const clampedX = Math.min(x, window.innerWidth - MENU_WIDTH - MENU_PADDING);
	const clampedY = Math.min(y, window.innerHeight - menuHeight - MENU_PADDING);

	const isEgoNode = nodeId
		? state.persons.find((p) => p.id === nodeId)?.isEgo === true
		: false;

	if (nodeId) {
		return (
			<div
				ref={menuRef}
				className="fixed z-50 min-w-[160px] rounded-md border border-gray-700 bg-gray-900 py-1 shadow-xl"
				style={{ left: clampedX, top: clampedY }}
			>
				<button
					type="button"
					onClick={handleEditNode}
					className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
				>
					<Pencil size={14} className="text-gray-400" />
					Edit
				</button>
				{!isEgoNode && (
					<button
						type="button"
						onClick={handleDeleteNode}
						className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
					>
						<Trash2 size={14} />
						Delete
					</button>
				)}
			</div>
		);
	}

	return (
		<div
			ref={menuRef}
			className="fixed z-50 min-w-[160px] rounded-md border border-gray-700 bg-gray-900 py-1 shadow-xl"
			style={{ left: clampedX, top: clampedY }}
		>
			<button
				type="button"
				onClick={handleEditEdge}
				className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
			>
				<Pencil size={14} className="text-gray-400" />
				Edit
			</button>
			<button
				type="button"
				onClick={handleDeleteEdge}
				className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
			>
				<Trash2 size={14} />
				Delete
			</button>
		</div>
	);
}
