import { createApp, type Component } from "vue";
import { IFRAME_STYLES } from "./iframe-styles.generated";

export const generateHTML = () => `
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Конфигуратор</title>
  </head>
  <body></body>
</html>
`;

function injectStyles(iframeDocument: Document) {
  const styleElement = iframeDocument.createElement("style");
  styleElement.textContent = IFRAME_STYLES;
  iframeDocument.head.appendChild(styleElement);
}

export const createIframe = (component: Component) => {
  const iframe = document.createElement("iframe");

  iframe.style.border = "none";
  iframe.style.display = "block";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.margin = "0";
  iframe.style.padding = "0";

  iframe.onload = () => {
    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDocument) return;

    iframeDocument.open();
    iframeDocument.write(generateHTML());
    iframeDocument.close();

    // Инжектим стили
    injectStyles(iframeDocument);

    const app = createApp(component);
    const body = iframeDocument.querySelector("body");
    if (body) app.mount(body);
  };

  return iframe;
};
