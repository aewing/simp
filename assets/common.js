window.$el = function (tag = "div", append = [], attr = {}) {
  const el = window.document.createElement(tag);
  Object.entries(attr).forEach(([key, val]) => el.setAttribute(key, val));
  if (Array.isArray(append)) {
    append.forEach((child) => el.appendChild(child));
  } else if (append instanceof Node) {
    el.appendChild(append);
  } else {
    el.innerHTML = append;
  }
  return el;
};

window.$component = function (tag, templateId, events = {}) {
  const template = document.getElementById(templateId);
  if (!template) {
    console.log(template, templateId);
    throw new Error(`Template not found: #${templateId}`);
  }
  customElements.define(
    tag,
    class extends HTMLElement {
      constructor() {
        super();
        const shadowRoot = this.attachShadow({ mode: "open" }).appendChild(
          template.content.cloneNode(true)
        );
        events.onInit && events.onInit(this);
      }

      connectedCallback() {
        events.onMount && events.onMount(this);
        events.onChange && events.onChange(this, name, oldValue);
      }

      static get observedAttributes() {
        return events.observedAttributes || [];
      }

      attributeChangedCallback(name, oldValue, newValue) {
        return events.onChange && events.onChange(this, name, oldValue);
      }

      disconnectedCallback() {
        return events.onDestroy && events.onDestroy(this);
      }

      shadow(selector) {
        return this.shadowRoot.querySelector(selector);
      }
    }
  );
};
