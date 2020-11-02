exports.get = function (req, res) {
  return {
    status: 200,
    body: {
      title: "Hello, world!",
      content: "This is an article",
      slug: "hello-world",
    },
  };
};
