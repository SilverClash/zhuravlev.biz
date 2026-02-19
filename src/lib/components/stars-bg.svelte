<script lang="ts">
	import type { Star } from '$lib/stars';

	const { stars }: { stars: Star[] } = $props();

	let svgEl: SVGSVGElement | undefined = $state();
	let lit: boolean[] = $state(stars.map(() => false));

	function handleMouseMove(e: MouseEvent) {
		if (!svgEl) return;
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return;
		const inv = ctm.inverse();
		const x = e.clientX * inv.a + e.clientY * inv.c + inv.e;
		const y = e.clientX * inv.b + e.clientY * inv.d + inv.f;

		for (let i = 0; i < stars.length; i++) {
			const s = stars[i];
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
		aria-label="Star field"
	>
		<title>Star field</title>

		<defs>
			<symbol id="star" viewBox="-10 -10 20 20">
				<path
					d="M 0 -8 L 1.2 -1.2 L 8 0 L 1.2 1.2 L 0 8 L -1.2 1.2 L -8 0 L -1.2 -1.2 Z"
					fill="currentColor"
				/>
			</symbol>
		</defs>

		{#each stars as star, i}
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
	</svg>
</div>

<style>
	.star {
		fill: #ffffff;
		transform-box: view-box;
		transition:
			opacity 1.25s ease-out,
			filter 1.25s ease-out,
			transform 1.25s ease-out;
	}

	.star.lit {
		opacity: 1 !important;
		filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.9));
		transform: scale(1.2);
		transition:
			opacity 0.05s ease-in,
			filter 0.05s ease-in,
			transform 0.05s ease-in;
	}
</style>
