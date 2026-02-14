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

	let svgEl: SVGSVGElement | undefined = $state();
	let lit: boolean[] = $state(moon.stars.map(() => false));

	function handleMouseMove(e: MouseEvent) {
		if (!svgEl) return;
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return;
		const inv = ctm.inverse();
		const x = e.clientX * inv.a + e.clientY * inv.c + inv.e;
		const y = e.clientX * inv.b + e.clientY * inv.d + inv.f;

		for (let i = 0; i < moon.stars.length; i++) {
			const s = moon.stars[i];
			const dx = x - s.x;
			const dy = y - s.y;
			if (dx * dx + dy * dy < (s.scale * 5) ** 2) {
				lit[i] = true;
			} else if (lit[i]) {
				lit[i] = false;
			}
		}
	}
</script>

<svelte:window onmousemove={handleMouseMove} />

<div class="pointer-events-none fixed inset-0 -z-10">
	<svg
		bind:this={svgEl}
		viewBox="0 0 100 100"
		preserveAspectRatio="xMidYMid slice"
		class="size-full"
		role="img"
		aria-label="{moon.name} moon phase"
	>
		<title>{moon.name}</title>

		<defs>
			<symbol id="star" viewBox="-10 -10 20 20">
				<path
					d="M 0 -8 L 1.2 -1.2 L 8 0 L 1.2 1.2 L 0 8 L -1.2 1.2 L -8 0 L -1.2 -1.2 Z"
					fill="currentColor"
				/>
			</symbol>
			<clipPath id="moon-cutout">
				<path d="M 0 0 H 100 V 100 H 0 Z M {moonCx} {moonCy - moonRadius} A {moonRadius} {moonRadius} 0 1 0 {moonCx} {moonCy + moonRadius} A {moonRadius} {moonRadius} 0 1 0 {moonCx} {moonCy - moonRadius} Z" clip-rule="evenodd" />
			</clipPath>
		</defs>

		<!-- Stars -->
		<g clip-path="url(#moon-cutout)">
			{#each moon.stars as star, i}
				<use
					href="#star"
					x={star.x - star.scale}
					y={star.y - star.scale}
					width={star.scale * 2}
					height={star.scale * 2}
					class="star"
					class:lit={lit[i]}
					style:opacity={star.opacity}
					style:transform-origin="{star.x}px {star.y}px"
				/>
			{/each}
		</g>

		<!-- Moon disc -->
		<g opacity="0.35">
			<circle cx={moonCx} cy={moonCy} r={moonRadius} fill="#e8e8e8" />
			<path d={shadowPath} fill="#111111" />
		</g>
	</svg>
</div>

<style>
	.star {
		fill: #ffffff;
		transform-box: view-box;
		transition:
			opacity 2.5s ease-out,
			filter 2.5s ease-out,
			transform 2.5s ease-out;
	}

	.star.lit {
		opacity: 1 !important;
		filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.9));
		transform: scale(1.7);
		transition:
			opacity 0.05s ease-in,
			filter 0.05s ease-in,
			transform 0.05s ease-in;
	}
</style>
