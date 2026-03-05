import "@univer/configurator";
import "./styles.css";
import models from "./models.config";

window.configuratorAPI.init({ models });
window.mountConfigurator("#app");
