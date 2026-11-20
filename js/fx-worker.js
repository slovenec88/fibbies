// Runs the chest-show particle engine off the page's main thread, drawing on a transferred canvas.
import { createEngine } from './fx-engine.js';

let engine = null;
onmessage = ({ data }) => {
  if (data.init) engine = createEngine(data.canvas, data.init);
  else if (data.resize) engine?.resize(...data.resize);
  else if (data.stop) { engine?.stop(); close(); }
  else engine?.run(data.fx, data.args);
};
