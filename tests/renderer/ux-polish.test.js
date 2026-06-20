const assert = require("assert/strict");
const { importEsmFromRepo } = require("../_utils/import-esm");

function createClassList() {
  const set = new Set();
  return {
    add: (...items) => items.forEach((item) => set.add(item)),
    remove: (...items) => items.forEach((item) => set.delete(item)),
    contains: (item) => set.has(item),
    toString: () => [...set].join(" ")
  };
}

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    attributes: {},
    dataset: {},
    className: "",
    classList: createClassList(),
    textContent: "",
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    remove() {
      if (!this.parentNode) return;
      this.parentNode.children = this.parentNode.children.filter((item) => item !== this);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "class") this.className = String(value);
      if (name.startsWith("data-")) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.dataset[key] = String(value);
      }
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

module.exports = async function uxPolishTests() {
  const listeners = {};
  const head = createElement("head");
  const body = createElement("body");
  const documentElement = createElement("html");

  global.document = {
    head,
    body,
    documentElement,
    createElement,
    getElementById: (id) => head.children.find((child) => child.attributes.id === id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    }
  };

  global.MutationObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() {}
  };
  global.requestAnimationFrame = (callback) => callback();
  global.setTimeout = (callback) => { callback(); return 1; };

  const { installUxPolish } = await importEsmFromRepo("src/renderer/ux-polish.js");
  installUxPolish();

  assert.equal(head.children.length, 1);
  assert.equal(head.children[0].attributes.id, "gestor-ux-polish");
  assert.match(head.children[0].textContent, /prefers-reduced-motion/);

  listeners.keydown[0]({ key: "Tab" });
  assert.equal(body.classList.contains("using-keyboard"), true);

  listeners.pointerdown[0]({});
  assert.equal(body.classList.contains("using-keyboard"), false);
};
