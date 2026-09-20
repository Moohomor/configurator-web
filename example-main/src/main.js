import "@univer/configurator";
import "./styles.css";
import models from "./models.config";

// SCORM-обёртка: все пути к ресурсам (модели, текстур-паки, превью)
// переводятся из абсолютных ("/models/...") в относительные ("models/...").
// Внутри LMS контент раздаётся из подкаталога, поэтому абсолютные пути
// вели бы на корень LMS-сервера. Относительные пути резолвятся библиотекой
// относительно document.baseURI (index.html курса).
const toRelative = (p) =>
  typeof p === "string" && p.startsWith("/") ? p.slice(1) : p;

for (const model of models) {
  if (model.path) model.path = toRelative(model.path);
  if (model.preview) model.preview = toRelative(model.preview);
  if (model.texturePacks) {
    for (const pack of model.texturePacks) {
      pack.path = toRelative(pack.path);
    }
  }
}

window.configuratorAPI.init({ models });
window.mountConfigurator("#app");