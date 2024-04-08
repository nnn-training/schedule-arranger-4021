const { html } = require("hono/html");

function layout(title, body) {
  return html`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <link rel="stylesheet" href="/stylesheets/style.css" />
        <script src="/javascripts/bundle.js"></script>
      </head>
      <body>
        ${body}
      </body>
    </html>
  `;
}

module.exports = layout;
