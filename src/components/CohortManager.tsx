"use client";

import { Palette, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGraph } from "@/context/GraphContext";
import { DEFAULT_COHORT_COLORS } from "@/lib/graph-constants";

interface CohortManagerProps {
	open: boolean;
	onClose: () => void;
}

export default function CohortManager({ open, onClose }: CohortManagerProps) {
	const { state, dispatch } = useGraph();
	const { cohorts, persons } = state;

	const [newCohortName, setNewCohortName] = useState("");
	const [editingColorId, setEditingColorId] = useState<string | null>(null);

	function getMemberCount(cohortId: string): number {
		return persons.filter((p) => p.cohortIds.includes(cohortId)).length;
	}

	function getNextColor(): string {
		return DEFAULT_COHORT_COLORS[cohorts.length % DEFAULT_COHORT_COLORS.length];
	}

	function handleAddCohort() {
		const trimmed = newCohortName.trim();
		if (!trimmed) return;
		dispatch({
			type: "ADD_COHORT",
			payload: { name: trimmed, color: getNextColor() },
		});
		setNewCohortName("");
	}

	function handleAddKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			handleAddCohort();
		}
	}

	function handleNameBlur(id: string, name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;
		dispatch({ type: "UPDATE_COHORT", payload: { id, name: trimmed } });
	}

	function handleNameKeyDown(
		e: React.KeyboardEvent<HTMLInputElement>,
		id: string,
	) {
		if (e.key === "Enter") {
			const trimmed = e.currentTarget.value.trim();
			if (trimmed) {
				dispatch({ type: "UPDATE_COHORT", payload: { id, name: trimmed } });
			}
			e.currentTarget.blur();
		}
	}

	function handleColorChange(cohortId: string, color: string) {
		dispatch({ type: "UPDATE_COHORT", payload: { id: cohortId, color } });
		setEditingColorId(null);
	}

	function handleRemove(id: string) {
		dispatch({ type: "REMOVE_COHORT", payload: { id } });
		if (editingColorId === id) setEditingColorId(null);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) onClose();
			}}
		>
			<DialogContent className="sm:max-w-[400px] gap-0 p-0">
				{/* Header */}
				<DialogHeader className="px-4 py-3">
					<DialogTitle className="text-sm">Manage Cohorts</DialogTitle>
				</DialogHeader>

				<Separator />

				{/* Cohort list */}
				<div className="px-4 py-3 space-y-2">
					{cohorts.length === 0 && (
						<p className="text-xs text-muted-foreground py-2 text-center">
							No cohorts yet. Add one below.
						</p>
					)}

					{cohorts.map((cohort) => (
						<div key={cohort.id} className="space-y-1.5">
							<div className="flex items-center gap-2">
								{/* Color dot + color picker toggle */}
								<button
									type="button"
									className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-accent"
									title="Change color"
									onClick={() =>
										setEditingColorId(
											editingColorId === cohort.id ? null : cohort.id,
										)
									}
								>
									<span
										className="inline-block size-3 rounded-full ring-1 ring-white/10"
										style={{ backgroundColor: cohort.color }}
									/>
								</button>

								{/* Editable name */}
								<Input
									defaultValue={cohort.name}
									className="h-7 flex-1 border-border bg-muted/60 px-2 text-xs text-foreground"
									onBlur={(e) =>
										handleNameBlur(cohort.id, e.currentTarget.value)
									}
									onKeyDown={(e) => handleNameKeyDown(e, cohort.id)}
								/>

								{/* Member count */}
								<span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
									{getMemberCount(cohort.id)}{" "}
									{getMemberCount(cohort.id) === 1 ? "member" : "members"}
								</span>

								{/* Delete */}
								<Button
									variant="ghost"
									size="icon-xs"
									className="shrink-0 text-muted-foreground hover:text-destructive"
									onClick={() => handleRemove(cohort.id)}
									title="Delete cohort"
								>
									<X className="size-3" />
								</Button>
							</div>

							{/* Color swatches (shown when editing) */}
							{editingColorId === cohort.id && (
								<div className="flex items-center gap-1.5 pl-7">
									<Palette className="size-3 text-muted-foreground" />
									{DEFAULT_COHORT_COLORS.map((color) => (
										<button
											key={color}
											type="button"
											className={`size-5 rounded-full transition-transform hover:scale-110 ${
												cohort.color === color
													? "ring-2 ring-white ring-offset-1 ring-offset-background"
													: "ring-1 ring-white/10"
											}`}
											style={{ backgroundColor: color }}
											onClick={() => handleColorChange(cohort.id, color)}
											title={color}
										/>
									))}
								</div>
							)}
						</div>
					))}
				</div>

				<Separator />

				{/* Add cohort */}
				<div className="px-4 py-3">
					<Label className="mb-1.5 text-xs text-muted-foreground">
						Add Cohort
					</Label>
					<div className="flex items-center gap-2">
						<span
							className="inline-block size-3 shrink-0 rounded-full ring-1 ring-white/10"
							style={{ backgroundColor: getNextColor() }}
						/>
						<Input
							value={newCohortName}
							onChange={(e) => setNewCohortName(e.target.value)}
							onKeyDown={handleAddKeyDown}
							placeholder="Cohort name..."
							className="h-7 flex-1 border-border bg-muted/60 px-2 text-xs text-foreground placeholder:text-muted-foreground"
						/>
						<Button
							variant="ghost"
							size="xs"
							className="shrink-0 text-muted-foreground hover:text-foreground"
							onClick={handleAddCohort}
							disabled={!newCohortName.trim()}
						>
							<Plus className="size-3" />
							Add
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
