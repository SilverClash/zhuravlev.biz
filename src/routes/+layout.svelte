<script lang="ts">
	import '../app.css';
	import MoonBg from '$lib/components/moon-bg.svelte';
	import { getMoonPhase } from '$lib/moon-phase';

	let { children } = $props();

	const moon = getMoonPhase();
</script>

<MoonBg {moon} />
{@render children()}
