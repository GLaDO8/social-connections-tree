"use client";

import { Download, Settings, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGraph } from "@/context/GraphContext";
import { exportGraph, importGraphFromFile } from "@/lib/persistence";

interface HeaderProps {
	onSettingsClick?: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
	const { state, dispatch } = useGraph();
	const { cohorts, activeCohortId, metadata } = state;

	function handleCohortChange(value: string) {
		dispatch({
			type: "SET_ACTIVE_COHORT",
			payload: { id: value === "all" ? null : value },
		});
	}

	function handleExport() {
		exportGraph(state);
	}

	async function handleImport() {
		const imported = await importGraphFromFile();
		if (imported) {
			dispatch({ type: "RESTORE_SNAPSHOT", payload: imported });
		}
	}

	return (
		<header className="flex h-12 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
			{/* Title */}
			<h1 className="truncate text-sm font-semibold text-foreground">
				{metadata.title}
			</h1>

			{/* Right section: cohort dropdown + settings */}
			<div className="flex items-center gap-2">
				<Select
					value={activeCohortId ?? "all"}
					onValueChange={handleCohortChange}
				>
					<SelectTrigger
						size="sm"
						className="min-w-[140px] border-border bg-muted/60 text-foreground"
					>
						<SelectValue placeholder="All" />
					</SelectTrigger>
					<SelectContent className="border-border bg-card text-foreground">
						<SelectItem value="all">All</SelectItem>
						{cohorts.map((cohort) => (
							<SelectItem key={cohort.id} value={cohort.id}>
								<span className="flex items-center gap-2">
									<span
										className="inline-block size-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: cohort.color }}
									/>
									{cohort.name}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-muted-foreground hover:text-foreground"
								onClick={handleExport}
							>
								<Download className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Export graph</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-muted-foreground hover:text-foreground"
								onClick={handleImport}
							>
								<Upload className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Import graph</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-muted-foreground hover:text-foreground"
								onClick={onSettingsClick}
							>
								<Settings className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Settings</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</header>
	);
}
