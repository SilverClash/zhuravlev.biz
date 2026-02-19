<script lang="ts">
	import '../app.css';
	import StarsBg from '$lib/components/stars-bg.svelte';
	import { generateStars } from '$lib/stars';

	let { children } = $props();

	const stars = generateStars({ count: 600, seed: 42 });
</script>

<StarsBg {stars} />
{@render children()}
