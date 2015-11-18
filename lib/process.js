
// ensure polyfills are set since
// this file is required standalone
// as a child process
require('babel-polyfill');

import Queue from 'queue3';
import Phantom from './phantom';
import processFrame from './process-frame';
import { PNG } from 'pngjs';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { GifWriter as GIF } from 'omggif';

export default class Process {

  constructor({ cols, rows, quality, keys, toolbar, fps }){
    this.cols = cols;
    this.rows = rows;
    this.quality = quality;
    this.debounce = 1000 / fps;

    // queue for frame processing
    this.queue = new Queue();

    // init browser
    this.browser = new Phantom({
      cols: this.cols,
      rows: this.rows,
      keys,
      toolbar
    });

    // defer processing until browser is ready
    this.queue.push(fn => this.browser.on('ready', fn));
  }

  title(title){
    this.queue.push(fn => {
      this.browser.title(title, fn);
    });
  }

  frame(data){
    let next;

    if (this.prev) {
      next = data;
      data = this.prev;
    } else {
      this.prev = data;
      return;
    }

    this.prev = next;

    return new Promise((resolve, reject) => {
      this.queue.push(fn => {
        this.browser.frame(data, buf => {
          let delay = next ? next.at - data.at : 0;
          resolve(this._addBuffer(buf, delay));
          fn();
        });
      });
    });
  }

  _addBuffer(buf, delay){
    return new Promise((resolve, reject) => {
      var png = new PNG();
      png.on('error', reject);
      png.on('parsed', () => {
        if (!this.encoder) {
          let { width, height } = png;
          this.width = width;
          this.height = height;
          this.gif = [];
          this.encoder = new GIF(this.gif, width, height, { loop: 0 });
        }

        let { width, height, quality } = this;
        let out = processFrame(png.data, width, height, quality);

        this.encoder.addFrame(0, 0, width, height, out.pixels, {
          // by spec, delay is specified in hundredths of seconds
          delay: Math.round(delay / 10),
          palette: out.palette
        });

        resolve(true);
      });
      png.write(buf);
    });
  }

  complete(){
    return new Promise((resolve, reject) => {
      // we always have a pending frame
      this.frame(null);

      this.queue.push(fn => {
        this.browser.destroy();
        resolve(this.gif);
        fn();
      });
    });
  }

}
