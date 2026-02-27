"use client";

import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { useCallback, useRef, useState } from "react";
import ChatInput from "@/components/ChatInput";
import CohortManager from "@/components/CohortManager";
import DevPanel from "@/components/DevPanel";
import GraphCanvas from "@/components/GraphCanvas";
import Header from "@/components/Header";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import PropertiesPanel from "@/components/PropertiesPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GraphProvider } from "@/context/GraphContext";
import type { VisualSettings } from "@/lib/graph-config";

export default function Home() {
	const [cohortManagerOpen, setCohortManagerOpen] = useState(false);
	const devSettingsRefHolder = useRef<React.MutableRefObject<VisualSettings> | null>(null);
	const scheduleRenderRef = useRef<(() => void) | null>(null);

	const handleDevSettingsRef = useCallback((ref: React.MutableRefObject<VisualSettings>) => {
		devSettingsRefHolder.current = ref;
	}, []);

	const handleScheduleRender = useCallback((fn: () => void) => {
		scheduleRenderRef.current = fn;
	}, []);

	const handleSettingsChange = useCallback(() => {
		scheduleRenderRef.current?.();
	}, []);

	return (
		<GraphProvider>
			<TooltipProvider delayDuration={300}>
				<KeyboardShortcuts />
				<div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
					<Header onSettingsClick={() => setCohortManagerOpen(true)} />
					<div className="flex-1 relative">
						<GraphCanvas
							devSettingsRef={devSettingsRefHolder}
							onScheduleRender={handleScheduleRender}
						/>
					</div>
					<ChatInput />
					<PropertiesPanel />
					<CohortManager open={cohortManagerOpen} onClose={() => setCohortManagerOpen(false)} />
					<DevPanel onSettingsRef={handleDevSettingsRef} onSettingsChange={handleSettingsChange} />
					<DialRoot position="top-left" defaultOpen={false} />
				</div>
			</TooltipProvider>
		</GraphProvider>
	);
}
