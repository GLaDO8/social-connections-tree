"use client";

import { useGraph } from "@/context/GraphContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

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

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-gray-800 bg-gray-900/80 px-4 backdrop-blur">
      {/* Title */}
      <h1 className="truncate text-sm font-semibold text-gray-100">
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
            className="min-w-[140px] border-gray-700 bg-gray-800/60 text-gray-200"
          >
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900 text-gray-200">
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

        <Button
          variant="ghost"
          size="icon-sm"
          className="text-gray-400 hover:text-gray-200"
          onClick={onSettingsClick}
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </header>
  );
}
