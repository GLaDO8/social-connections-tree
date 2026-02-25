"use client";

import { useState } from "react";
import { useGraph } from "@/context/GraphContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus, Palette } from "lucide-react";
import { DEFAULT_COHORT_COLORS } from "@/lib/graph-utils";

interface CohortManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function CohortManager({ open, onClose }: CohortManagerProps) {
  const { state, dispatch } = useGraph();
  const { cohorts, persons } = state;

  const [newCohortName, setNewCohortName] = useState("");
  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  if (!open) return null;

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
    id: string
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">
            Manage Cohorts
          </h2>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-gray-400 hover:text-gray-200"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Cohort list */}
        <div className="px-4 py-3 space-y-2">
          {cohorts.length === 0 && (
            <p className="text-xs text-gray-500 py-2 text-center">
              No cohorts yet. Add one below.
            </p>
          )}

          {cohorts.map((cohort) => (
            <div key={cohort.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                {/* Color dot + color picker toggle */}
                <button
                  type="button"
                  className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-gray-800"
                  title="Change color"
                  onClick={() =>
                    setEditingColorId(
                      editingColorId === cohort.id ? null : cohort.id
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
                  className="h-7 flex-1 border-gray-700 bg-gray-800/60 px-2 text-xs text-gray-200"
                  onBlur={(e) => handleNameBlur(cohort.id, e.currentTarget.value)}
                  onKeyDown={(e) => handleNameKeyDown(e, cohort.id)}
                />

                {/* Member count */}
                <span className="shrink-0 text-[10px] tabular-nums text-gray-500">
                  {getMemberCount(cohort.id)} {getMemberCount(cohort.id) === 1 ? "member" : "members"}
                </span>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-gray-500 hover:text-red-400"
                  onClick={() => handleRemove(cohort.id)}
                  title="Delete cohort"
                >
                  <X className="size-3" />
                </Button>
              </div>

              {/* Color swatches (shown when editing) */}
              {editingColorId === cohort.id && (
                <div className="flex items-center gap-1.5 pl-7">
                  <Palette className="size-3 text-gray-500" />
                  {DEFAULT_COHORT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`size-5 rounded-full transition-transform hover:scale-110 ${
                        cohort.color === color
                          ? "ring-2 ring-white ring-offset-1 ring-offset-gray-900"
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

        {/* Add cohort */}
        <div className="border-t border-gray-700 px-4 py-3">
          <Label className="mb-1.5 text-xs text-gray-300">Add Cohort</Label>
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
              className="h-7 flex-1 border-gray-700 bg-gray-800/60 px-2 text-xs text-gray-200 placeholder:text-gray-500"
            />
            <Button
              variant="ghost"
              size="xs"
              className="shrink-0 text-gray-400 hover:text-gray-200"
              onClick={handleAddCohort}
              disabled={!newCohortName.trim()}
            >
              <Plus className="size-3" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
