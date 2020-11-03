<script context="module">
  export async function preload(page, session) {
    const req = await fetch("/index.json");
    const json = await req.json();
    return json;
  }
</script>

<script>
  import Article from "../components/Article.svelte";
  import Button from "../components/Button.svelte";
  export let articles;
</script>

<style>
  section {
    padding: 0 8px 16px 8px;
    border-bottom: 2px solid #eee;
    margin-bottom: 16px;
  }
</style>

<section>
  <h1>Static Content</h1>
  <p>Check this out!</p>
  <img src="/assets/staffy.png" alt="Good boi" />
</section>
<section>
  <h2>Components</h2>
  <Button color="orange">Hello, world!</Button>
  <button>Hello, world!</button>
</section>
<section>
  <h3>Dynamic Content</h3>
  <div id="articles">
    {#each articles as article}
      <Article>
        <h2 slot="title">{article.title}</h2>
        {@html article.content}
      </Article>
    {/each}
  </div>
</section>
