const SYNODIC_MONTH = 29.53058770576;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export interface MoonPhase {
	/** 0–1 progress through the lunar cycle (0 = new moon, 0.5 = full moon) */
	phase: number;
	name: string;
}

const PHASE_NAMES: [number, string][] = [
	[0.0375, 'New Moon'],
	[0.2125, 'Waxing Crescent'],
	[0.2875, 'First Quarter'],
	[0.4625, 'Waxing Gibbous'],
	[0.5375, 'Full Moon'],
	[0.7125, 'Waning Gibbous'],
	[0.7875, 'Last Quarter'],
	[0.9625, 'Waning Crescent'],
	[1, 'New Moon']
];

function getPhaseName(phase: number) {
	for (const [threshold, name] of PHASE_NAMES) {
		if (phase < threshold) return name;
	}
	return 'New Moon';
}

export function getMoonPhase(date: Date = new Date()): MoonPhase {
	const diffMs = date.getTime() - KNOWN_NEW_MOON;
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	const phase = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;

	return { phase, name: getPhaseName(phase) };
}
