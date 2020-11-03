<script context="module">
  export async function preload(page, session) {
    const req = await fetch(`/article/${page.slug}.json`);
    const article = await req.json();
    return { article };
  }
</script>

<script>
  import Article from "../../components/Article.svelte";
  export let article;
</script>

<style>
  h1 {
    margin: 0 0 16px 0;
  }
</style>

<svelte:head>
  <title>{article.title} | simp</title>
</svelte:head>

<h1>Svelte SSR</h1>
<p>Like Sapper, but without Rollup.</p>

<p>Data can be loaded in routes using the preload export in module context.</p>

<Article>
  <h2 slot="title">{article.title}</h2>
  <p>{article.content}</p>
</Article>
