import React from "react";
import { z } from "zod";
import { defineComponent } from "@openuidev/react-lang";
import { openuiLibrary } from "@openuidev/react-ui";
import { defineGraphViewerComponent } from "../../../graph-viewer/src/openui.mjs";

// The real graph-viewer: the page loads graph-viewer/dist/graph-viewer.js (window.GraphViewer);
// in node (prompt building, parsing) there is nothing to mount and the component is never drawn.
const mount = (el, opts) => globalThis.GraphViewer.mount(el, opts);
export const GraphViewer = defineGraphViewerComponent({ React, defineComponent, z, mount });

/** The full OpenUI library (control) or the router's cut-down one (remove list + custom components). */
export function libraryFor(plan, mode) {
  if (mode === "plain") return openuiLibrary;
  const add = plan.customComponents.some((c) => c.name === "GraphViewer") ? [{ component: GraphViewer, slots: ["Card.children"] }] : [];
  return openuiLibrary.extend({ components: { remove: plan.removeFromLibrary, ...(add.length ? { add } : {}) } });
}
