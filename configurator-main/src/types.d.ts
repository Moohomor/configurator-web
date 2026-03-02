import type { ConfiguratorAPI } from "./api/configurator";

declare global {
  interface Window {
    mountConfigurator: (el: string) => void;
    configuratorAPI: ConfiguratorAPI;
  }
}

export {};
