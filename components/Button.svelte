<script>
  export let color;
</script>

<style>
  button {
    padding: 8px 16px;
    border-radius: 8px;
    background: blue;
    color: white;
    appearance: none;
    border: none;
    font-weight: bolder;
    cursor: pointer;
  }

  button.orange {
    background: orange;
    color: black;
  }
</style>

<button class={color}>
  <slot />
</button>
