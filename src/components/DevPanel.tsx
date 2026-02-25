"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ForceSimulation, LinkDatum } from "@/lib/force-config";
import { NODE_RADIUS } from "@/lib/graph-constants";

interface DevPanelProps {
	open: boolean;
	onClose: () => void;
	simulationRef: React.RefObject<React.RefObject<ForceSimulation | null> | null>;
}

interface DevSettings {
	repulsion: number;
	linkDistanceMultiplier: number;
	alphaDecay: number;
	collisionPadding: number;
}

const DEFAULTS: DevSettings = {
	repulsion: -400,
	linkDistanceMultiplier: 1,
	alphaDecay: 0.02,
	collisionPadding: 10,
};

const STORAGE_KEY = "sct-dev-settings";

function loadSettings(): DevSettings {
	if (typeof window === "undefined") return DEFAULTS;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (typeof parsed === "object" && parsed !== null) {
				return { ...DEFAULTS, ...parsed };
			}
		}
	} catch {
		// ignore
	}
	return DEFAULTS;
}

function saveSettings(settings: DevSettings) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// ignore
	}
}

export default function DevPanel({
	open,
	onClose,
	simulationRef,
}: DevPanelProps) {
	const [settings, setSettings] = useState<DevSettings>(DEFAULTS);
	const [mounted, setMounted] = useState(false);

	// Load saved settings on mount
	useEffect(() => {
		const saved = loadSettings();
		setSettings(saved);
		setMounted(true);
	}, []);

	// Resolve the simulation from the ref-of-ref (page.tsx → GraphCanvas → useForceSimulation)
	function getSimulation(): ForceSimulation | null {
		return simulationRef.current?.current ?? null;
	}

	// Apply settings to simulation whenever they change (after mount)
	// biome-ignore lint/correctness/useExhaustiveDependencies: getSimulation reads from stable ref
	const applyToSimulation = useCallback(
		(s: DevSettings) => {
			const sim = getSimulation();
			if (!sim) return;

			const charge = sim.force("charge");
			if (charge && "strength" in charge) {
				(charge as { strength: (v: number) => void }).strength(s.repulsion);
			}

			const link = sim.force("link");
			if (link && "distance" in link) {
				(link as { distance: (fn: (d: LinkDatum) => number) => void }).distance(
					(d: LinkDatum) =>
						(300 - d.bondStrength * 50) * s.linkDistanceMultiplier,
				);
			}

			sim.alphaDecay(s.alphaDecay);

			const collide = sim.force("collide");
			if (collide && "radius" in collide) {
				(collide as { radius: (v: number) => void }).radius(
					s.collisionPadding + NODE_RADIUS,
				);
			}

			sim.alpha(0.3).restart();
		},
		[simulationRef],
	);

	// Apply loaded settings to simulation once mounted (with delay for simulation init)
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only runs when mounted flips
	useEffect(() => {
		if (mounted) {
			const timer = setTimeout(() => applyToSimulation(settings), 100);
			return () => clearTimeout(timer);
		}
	}, [mounted]);

	const updateSetting = useCallback(
		<K extends keyof DevSettings>(key: K, value: DevSettings[K]) => {
			setSettings((prev) => {
				const next = { ...prev, [key]: value };
				saveSettings(next);
				applyToSimulation(next);
				return next;
			});
		},
		[applyToSimulation],
	);

	const resetToDefaults = useCallback(() => {
		setSettings(DEFAULTS);
		saveSettings(DEFAULTS);
		applyToSimulation(DEFAULTS);
	}, [applyToSimulation]);

	if (!open) return null;

	return (
		<div className="fixed left-4 top-16 w-72 z-40 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg shadow-xl text-gray-100">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-4 pb-2">
				<h2 className="text-sm font-semibold tracking-wide uppercase text-gray-300">
					Dev Panel
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="text-gray-400 hover:text-gray-200 transition-colors"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Controls */}
			<div className="px-4 pb-4 space-y-5">
				{/* Repulsion Strength */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs text-gray-400">Repulsion strength</Label>
						<span className="text-xs font-mono text-gray-300">
							{settings.repulsion}
						</span>
					</div>
					<Slider
						value={[settings.repulsion]}
						onValueChange={([v]) => updateSetting("repulsion", v)}
						min={-1000}
						max={-100}
						step={10}
					/>
				</div>

				{/* Link Distance Multiplier */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs text-gray-400">Link distance mult.</Label>
						<span className="text-xs font-mono text-gray-300">
							{settings.linkDistanceMultiplier.toFixed(1)}
						</span>
					</div>
					<Slider
						value={[settings.linkDistanceMultiplier]}
						onValueChange={([v]) => updateSetting("linkDistanceMultiplier", v)}
						min={0.5}
						max={3}
						step={0.1}
					/>
				</div>

				{/* Alpha Decay */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs text-gray-400">Alpha decay</Label>
						<span className="text-xs font-mono text-gray-300">
							{settings.alphaDecay.toFixed(3)}
						</span>
					</div>
					<Slider
						value={[settings.alphaDecay]}
						onValueChange={([v]) => updateSetting("alphaDecay", v)}
						min={0.005}
						max={0.1}
						step={0.005}
					/>
				</div>

				{/* Collision Padding */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs text-gray-400">Collision padding</Label>
						<span className="text-xs font-mono text-gray-300">
							{settings.collisionPadding}
						</span>
					</div>
					<Slider
						value={[settings.collisionPadding]}
						onValueChange={([v]) => updateSetting("collisionPadding", v)}
						min={0}
						max={30}
						step={1}
					/>
				</div>

				{/* Reset */}
				<Button
					variant="outline"
					size="sm"
					onClick={resetToDefaults}
					className="w-full text-xs border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
				>
					Reset to defaults
				</Button>
			</div>
		</div>
	);
}
