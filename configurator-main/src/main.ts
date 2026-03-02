import { mount } from "@/helpers/mount";
import { configuratorAPI } from "@/api/configurator";
import "@/styles/global.css";

window.mountConfigurator = (el: string) => {
  mount(el);
};

window.configuratorAPI = configuratorAPI;
