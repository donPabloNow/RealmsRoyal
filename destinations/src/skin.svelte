<script>
  import { onDestroy, onMount } from 'svelte';
	import { getUserSkin } from './auth.js';
  
  export var user;
  export var width;
  export var height;
  var canvas;
  var texture = new Image();
	onMount(() => {
		var ctx = canvas.getContext('2d');
		ctx.imageSmoothingEnabled = false;
    texture.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(texture, 8, 8, 8, 8, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(texture, 40, 8, 8, 8, 0, 0, canvas.width, canvas.height);
    };
  });
  onDestroy(() => {
    texture.onload = null;
  });
  $: texture.src = getUserSkin(user);
</script>

<canvas
  bind:this={canvas}
  width={width}
  height={height}
/>

<style>
  canvas {
    vertical-align: middle;
  }
</style>