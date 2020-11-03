<script>
  export let slug;
  export let depth = 0;
</script>

<style>
  a {
    text-decoration: none;
    color: inherit;
  }
  article {
    padding: 8px 16px;
    border-radius: 8px;
    background: #eee;
    margin: 8px 0;
    box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.07);
  }
  h2 {
    text-decoration: none;
    color: blue;
    font-size: 24px;
    font-weight: bold;
    margin: 0 0 8px;
    padding: 0;
  }
</style>

{#if depth}
  <a href={`/article/${slug}`}>
    <article>
      <h2>
        <slot name="title" />
      </h2>
      <slot />
    </article>
  </a>
{:else}
  <article>
    <h2>
      <slot name="title" />
    </h2>
    <slot />
  </article>
{/if}
