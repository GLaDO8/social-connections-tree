"use client";

import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

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
	return (
		<TooltipProvider>
			<div className="absolute right-4 bottom-20 flex flex-col gap-1 z-10">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="icon-sm"
							className="bg-background/80 backdrop-blur"
							onClick={onZoomIn}
						>
							<ZoomIn size={16} />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="left">Zoom in</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="icon-sm"
							className="bg-background/80 backdrop-blur"
							onClick={onZoomOut}
						>
							<ZoomOut size={16} />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="left">Zoom out</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="icon-sm"
							className="bg-background/80 backdrop-blur"
							onClick={onFitToScreen}
						>
							<Maximize2 size={16} />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="left">Fit to screen</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
