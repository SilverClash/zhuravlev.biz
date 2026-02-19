export interface Star {
	x: number;
	y: number;
	scale: number;
	opacity: number;
}

function seededRandom(seed: number) {
	let s = seed;
	return () => {
		s = (s * 16807 + 0) % 2147483647;
		return s / 2147483647;
	};
}

export function generateStars({ count, seed }: { count: number; seed: number }): Star[] {
	const rng = seededRandom(seed);
	const stars: Star[] = [];

	for (let i = 0; i < count; i++) {
		const x = rng() * 100;
		const y = rng() * 100;

		stars.push({
			x,
			y,
			scale: rng() * 0.28 + 0.1,
			opacity: rng() * 0.5 + 0.3
		});
	}

	return stars;
}
