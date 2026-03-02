import App from "@/app/App.vue";
import { createIframe } from "./iframe";

export const mount = (selector: string) => {
  const iframe = createIframe(App);
  const container = document.querySelector(selector);
  if (container) container.append(iframe);
};
