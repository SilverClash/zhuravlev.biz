<script lang="ts">
	import type { MoonPhase } from '$lib/moon-phase';

	const { moon }: { moon: MoonPhase } = $props();

	const radius = 160;
	const cx = 200;
	const cy = 200;

	const terminatorX = $derived(Math.cos(moon.phase * 2 * Math.PI) * radius);

	const litSide = $derived(moon.phase <= 0.5 ? 'right' : 'left');

	const shadowPath = $derived.by(() => {
		const top = cy - radius;
		const bottom = cy + radius;
		const sweep = litSide === 'right' ? 0 : 1;
		const terminatorSweep = terminatorX > 0 ? 1 : 0;

		return [
			`M ${cx} ${top}`,
			`A ${radius} ${radius} 0 0 ${sweep} ${cx} ${bottom}`,
			`A ${Math.abs(terminatorX)} ${radius} 0 0 ${terminatorSweep} ${cx} ${top}`,
			'Z'
		].join(' ');
	});
</script>

<div class="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center">
	<svg
		viewBox="0 0 400 400"
		class="h-full max-h-[80vh] w-auto opacity-35"
		role="img"
		aria-label="{moon.name} moon phase"
	>
		<title>{moon.name}</title>
		<!-- Moon disc -->
		<circle {cx} {cy} r={radius} fill="#e8e8e8" />
		<!-- Shadow overlay -->
		<path d={shadowPath} fill="#0a0a0a" />
	</svg>
</div>
