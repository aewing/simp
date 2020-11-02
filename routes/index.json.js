exports.get = function (req) {
  return {
    body: {
      articles: [
        {
          title: "Hello, world",
          content: "<p>This is an example article</p>",
          slug: "hello-world",
        },
      ],
    },
  };
};
