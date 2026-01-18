<script lang="ts">
  import PacmoonView from './pacmoon-view.svelte';
</script>

<svelte:head>
  <title>Pacmoon</title>
  <meta name="description" content="Classic Pacmoon arcade game" />
</svelte:head>

<div class="pacmoon-container">
  <PacmoonView />
</div>

<style>
  .pacmoon-container {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
    touch-action: none;
    user-select: none;
  }
</style>
