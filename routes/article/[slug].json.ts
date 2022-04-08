export async function get(req, res) {
  return {
    status: 200,
    body: {
      title: "Hello, world!",
      content: "This is an article",
      slug: "hello-world",
    },
  };
}
