import { createApp, type Component } from "vue";
// Импортируем стили, чтобы Vite их обработал
import "../styles/global.css";

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
  // Хардкодим стили напрямую - это единственный надежный способ для iframe
  const styles = `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    #app, body, html { width: 100%; height: 100%; overflow: hidden; }
    .configurator-model-selector { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .configurator-model-selector h2 { text-align: center; margin-bottom: 30px; color: #333; font-size: 28px; }
    .configurator-model-selector .models-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    .configurator-model-selector .model-card { background: #fff; border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s ease; }
    .configurator-model-selector .model-card:hover { border-color: #4a90e2; transform: translateY(-4px); box-shadow: 0 8px 16px #0000001a; }
    .configurator-model-selector .model-preview { width: 100%; height: 150px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }
    .configurator-model-selector .model-preview img { width: 100%; height: 100%; object-fit: cover; }
    .configurator-model-selector .preview-placeholder { font-size: 64px; }
    .configurator-model-selector h3 { text-align: center; margin: 0; color: #555; font-size: 18px; }
    .viewer-container { width: 100%; height: 100%; position: relative; }
    .configurator-sidebar { width: 320px; height: 100%; background: #fff; border-right: 1px solid #e0e0e0; display: flex; flex-direction: column; overflow-y: auto; }
    .sidebar-header { padding: 20px; border-bottom: 1px solid #e0e0e0; }
    .sidebar-header h2 { margin: 0 0 15px; font-size: 24px; color: #333; }
    .back-button { background: #f5f5f5; border: 1px solid #ddd; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
    .back-button:hover { background: #e8e8e8; }
    .sidebar-section { padding: 20px; border-bottom: 1px solid #e0e0e0; }
    .sidebar-section h3 { margin: 0 0 15px; font-size: 16px; color: #555; font-weight: 600; }
    .texture-packs-list { display: flex; flex-direction: column; gap: 10px; }
    .texture-pack-item { padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: #fff; }
    .texture-pack-item:hover { border-color: #4a90e2; background: #f0f7ff; }
    .texture-pack-item.active { border-color: #4a90e2; background: #4a90e2; }
    .texture-pack-item.active .pack-name { color: #fff; font-weight: 600; }
    .pack-name { font-size: 14px; color: #333; }
    .part-description { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .part-description h4 { margin: 0 0 10px 0; font-size: 16px; color: #333; }
    .description-text { margin: 0 0 10px 0; font-size: 14px; color: #666; line-height: 1.5; }
    .part-meta { display: flex; gap: 8px; font-size: 13px; }
    .meta-label { color: #888; font-weight: 500; }
    .meta-value { color: #555; }
    .parts-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
    .part-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
    .part-item:hover { background: #f9f9f9; border-color: #bbb; }
    .part-item.selected { border-color: #4a90e2; background: #f0f7ff; }
    .part-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .part-name { font-size: 14px; font-weight: 500; color: #333; }
    .part-material { font-size: 12px; color: #888; }
    .sidebar-footer { padding: 20px; margin-top: auto; }
    .reset-button { width: 100%; background: #f44336; color: #fff; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .reset-button:hover { background: #d32f2f; }
    .app { width: 100%; height: 100vh; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
    .configurator { display: flex; width: 100%; height: 100%; }
    .viewer-wrapper { flex: 1; height: 100%; background: #f5f5f5; }
  `;

  const styleElement = iframeDocument.createElement("style");
  styleElement.textContent = styles;
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
