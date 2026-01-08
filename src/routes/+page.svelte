<script lang="ts">
	import { Github, Linkedin, type Icon } from '@lucide/svelte';

	const links: { name: string; href: string; icon: typeof Icon }[] = [
		{ name: 'GitHub', href: 'https://github.com/SilverClash', icon: Github },
		{ name: 'LinkedIn', href: 'https://www.linkedin.com/in/alexey-zh/', icon: Linkedin }
	];
</script>

<svelte:head>
	<title>Alexey Zhuravlev</title>
	<meta name="description" content="Personal website of Alexey Zhuravlev" />
</svelte:head>

<main class="flex min-h-screen flex-col items-center px-6 pt-32 font-sans">
	<h1 class="text-3xl font-medium text-neutral-100">Alexey Zhuravlev</h1>

	<nav class="mt-8 flex gap-4">
		{#each links as link}
			{@const IconComponent = link.icon}
			<a
				href={link.href}
				target="_blank"
				rel="noopener noreferrer"
				class="text-neutral-400 transition-colors hover:text-neutral-100"
				aria-label={link.name}
			>
				<IconComponent class="size-5" />
			</a>
		{/each}
	</nav>
</main>
