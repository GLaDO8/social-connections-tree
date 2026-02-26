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
import type { ForceSimulation } from "@/lib/force-config";
import type { DevSettings } from "@/types/dev-settings";

export default function Home() {
	const [cohortManagerOpen, setCohortManagerOpen] = useState(false);
	const simulationRefHolder =
		useRef<React.RefObject<ForceSimulation | null> | null>(null);
	const devSettingsRefHolder =
		useRef<React.MutableRefObject<DevSettings> | null>(null);

	const handleSimulationReady = useCallback(
		(ref: React.RefObject<ForceSimulation | null>) => {
			simulationRefHolder.current = ref;
		},
		[],
	);

	const handleDevSettingsRef = useCallback(
		(ref: React.MutableRefObject<DevSettings>) => {
			devSettingsRefHolder.current = ref;
		},
		[],
	);

	return (
		<GraphProvider>
			<TooltipProvider delayDuration={300}>
				<KeyboardShortcuts />
				<div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
					<Header onSettingsClick={() => setCohortManagerOpen(true)} />
					<div className="flex-1 relative">
						<GraphCanvas
							onSimulationReady={handleSimulationReady}
							devSettingsRef={devSettingsRefHolder}
						/>
					</div>
					<ChatInput />
					<PropertiesPanel />
					<CohortManager
						open={cohortManagerOpen}
						onClose={() => setCohortManagerOpen(false)}
					/>
					<DevPanel
						simulationRef={simulationRefHolder}
						onSettingsRef={handleDevSettingsRef}
					/>
					<DialRoot position="top-left" defaultOpen={false} />
				</div>
			</TooltipProvider>
		</GraphProvider>
	);
}
