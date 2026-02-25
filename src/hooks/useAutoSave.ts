import { useEffect, useRef } from "react";
import { saveGraph } from "@/lib/persistence";
import type { SocialGraph } from "@/types/graph";

const DEBOUNCE_MS = 500;

/**
 * Debounced auto-save. Triggers on structural changes (persons, relationships,
 * cohorts, metadata) — NOT on physics-only position updates.
 *
 * We use metadata.updatedAt as the change signal since the reducer bumps it
 * on every structural mutation.
 */
export function useAutoSave(state: SocialGraph): void {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => {
			saveGraph(state);
		}, DEBOUNCE_MS);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, [state]);
}
