"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatInput from "@/components/ChatInput";
import CohortManager from "@/components/CohortManager";
import DevPanel from "@/components/DevPanel";
import GraphCanvas from "@/components/GraphCanvas";
import Header from "@/components/Header";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import PropertiesPanel from "@/components/PropertiesPanel";
import { GraphProvider } from "@/context/GraphContext";
import type { ForceSimulation } from "@/lib/force-config";

export default function Home() {
	const [cohortManagerOpen, setCohortManagerOpen] = useState(false);
	const [devPanelOpen, setDevPanelOpen] = useState(false);
	const simulationRefHolder =
		useRef<React.RefObject<ForceSimulation | null> | null>(null);

	const handleSimulationReady = useCallback(
		(ref: React.RefObject<ForceSimulation | null>) => {
			simulationRefHolder.current = ref;
		},
		[],
	);

	// Keyboard shortcut: Cmd+Shift+D to toggle dev panel
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "d") {
				e.preventDefault();
				setDevPanelOpen((prev) => !prev);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<GraphProvider>
			<KeyboardShortcuts />
			<div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-950">
				<Header onSettingsClick={() => setCohortManagerOpen(true)} />
				<div className="flex-1 relative">
					<GraphCanvas onSimulationReady={handleSimulationReady} />
				</div>
				<ChatInput />
				<PropertiesPanel />
				<CohortManager
					open={cohortManagerOpen}
					onClose={() => setCohortManagerOpen(false)}
				/>
				<DevPanel
					open={devPanelOpen}
					onClose={() => setDevPanelOpen(false)}
					simulationRef={simulationRefHolder}
				/>
			</div>
		</GraphProvider>
	);
}
