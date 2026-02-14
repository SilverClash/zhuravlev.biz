<script lang="ts">
	import type { MoonPhase } from '$lib/moon-phase';

	const { moon }: { moon: MoonPhase } = $props();

	const moonRadius = 18;
	const moonCx = 50;
	const moonCy = 50;

	const terminatorX = $derived(Math.cos(moon.phase * 2 * Math.PI) * moonRadius);

	const litSide = $derived(moon.phase <= 0.5 ? 'right' : 'left');

	const shadowPath = $derived.by(() => {
		const top = moonCy - moonRadius;
		const bottom = moonCy + moonRadius;
		const sweep = litSide === 'right' ? 0 : 1;
		const terminatorSweep = terminatorX > 0 ? 1 : 0;

		return [
			`M ${moonCx} ${top}`,
			`A ${moonRadius} ${moonRadius} 0 0 ${sweep} ${moonCx} ${bottom}`,
			`A ${Math.abs(terminatorX)} ${moonRadius} 0 0 ${terminatorSweep} ${moonCx} ${top}`,
			'Z'
		].join(' ');
	});
</script>

<div class="pointer-events-none fixed inset-0 -z-10">
	<svg
		viewBox="0 0 100 100"
		preserveAspectRatio="xMidYMid slice"
		class="size-full opacity-35"
		role="img"
		aria-label="{moon.name} moon phase"
	>
		<title>{moon.name}</title>

		<defs>
			<!-- 4-pointed spike star shape -->
			<symbol id="star" viewBox="-10 -10 20 20">
				<path
					d="M 0 -8 L 1.2 -1.2 L 8 0 L 1.2 1.2 L 0 8 L -1.2 1.2 L -8 0 L -1.2 -1.2 Z"
					fill="currentColor"
				/>
			</symbol>
		</defs>

		<!-- Stars -->
		{#each moon.stars as star}
			<use
				href="#star"
				x={star.x - star.scale}
				y={star.y - star.scale}
				width={star.scale * 2}
				height={star.scale * 2}
				opacity={star.opacity}
				class="text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.6)]"
			/>
		{/each}

		<!-- Moon disc -->
		<circle cx={moonCx} cy={moonCy} r={moonRadius} fill="#e8e8e8" />
		<!-- Shadow overlay -->
		<path d={shadowPath} fill="#111111" />
	</svg>
</div>
