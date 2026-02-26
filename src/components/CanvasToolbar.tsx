"use client";

import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

interface CanvasToolbarProps {
	onZoomIn: () => void;
	onZoomOut: () => void;
	onFitToScreen: () => void;
}

export default function CanvasToolbar({
	onZoomIn,
	onZoomOut,
	onFitToScreen,
}: CanvasToolbarProps) {
	const buttonClass =
		"flex items-center justify-center w-8 h-8 rounded bg-gray-800/80 backdrop-blur border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors";

	return (
		<div className="absolute right-4 bottom-20 flex flex-col gap-1 z-10">
			<button
				type="button"
				onClick={onZoomIn}
				className={buttonClass}
				aria-label="Zoom in"
				title="Zoom in"
			>
				<ZoomIn size={16} />
			</button>
			<button
				type="button"
				onClick={onZoomOut}
				className={buttonClass}
				aria-label="Zoom out"
				title="Zoom out"
			>
				<ZoomOut size={16} />
			</button>
			<button
				type="button"
				onClick={onFitToScreen}
				className={buttonClass}
				aria-label="Fit to screen"
				title="Fit to screen"
			>
				<Maximize2 size={16} />
			</button>
		</div>
	);
}
