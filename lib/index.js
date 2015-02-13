
require('6to5/polyfill');

import { exec } from 'child_process';
import { EventEmitter } from 'events';
import { spawn as pty } from 'child_pty';
import clone from 'clone';
import keypress from 'keypress';
import Worker from './worker';

export default class Clif extends EventEmitter {

  constructor({ shell, fps, env, rows, cols, keys, toolbar, quality, cwd, argv }){
    // settings
    this.fps = fps || 8;
    this.cols = cols || 90;
    this.rows = rows || 30;
    this.quality = quality || 20;
    this.keys = !!keys;
    this.toolbar = !!toolbar;

    // state
    this.pending = 0;
    this.keybuf = [];

    this.worker = new Worker({
      fps: this.fps,
      cols: this.cols,
      rows: this.rows,
      keys: this.keys,
      toolbar: this.toolbar,
      quality: this.quality
    });

    env = clone(env || process.env);
    env.TERM = env.TERM || 'xterm-256color';

    this.pty = pty(shell, argv, {
      cwd: cwd,
      rows: this.rows,
      columns: this.cols,
      env: env
    });

    // in
    if (this.keys) keypress(process.stdin);
    this.rawState = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.pipe(this.pty.stdin);
    process.stdin.on('keypress', (c, k) => this.key(c, k));

    // out
    this.pty.stdout.on('data', buf => this.out(buf));
    this.pty.on('exit', () => this.complete());

    // poll title
    if (this.toolbar) this.getTitle();
  }

  out(buf){
    if (null == this.pendingFrame) {
      // first frame always flushed
      this.pendingFrame = '';
      this.frame(buf);
    } else {
      this.pendingFrame += buf;

      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.frame(this.pendingFrame);
          this.flushTimer = null;
          this.pendingFrame = '';
          this.emit('flush');
        }, Math.round(1000 / this.fps));
      }
    }

    process.stdout.write(buf);
  }

  key(c, k){
    this.keybuf.push(k);
  }

  frame(buf){
    if (null == buf) buf = '';

    // pre-process buf to replace the 
    // prefixed symbol hoping it has
    // no unanticipated side-effects
    let re = /\u001b\[91m ● \u001b\[00m/g;
    buf = buf.toString('utf8').replace(re, '');

    this.pending++;
    this.worker.frame({
      at: Date.now(),
      data: buf,
      keys: this.keybuf
    })
    .then(() => {
      this.pending--;
      this.emit('process frame');
    });

    this.keybuf = [];
  }

  getTitle(){
    let tty = this.pty.stdout.ttyname;
    tty = tty.replace(/^\/dev\/tty/, '');

    // try to exclude grep from the results
    // by grepping for `[s]001` instead of `s001`
    tty = `[${tty[0]}]${tty.substr(1)}`;

    exec(`ps c | grep ${tty} | tail -n 1`, (err, out) => {
      if (this.ended) return;
      if (err) return;
      let title = out.split(' ').pop();
      if (title) {
        title = title.replace(/^\(/, '');
        title = title.replace(/\)?\n$/, '');
        if (title != this.lastTitle) {
          this.worker.title(title);
          this.lastTitle = title;
        }
      }
      this.titlePoll = setTimeout(() => this.getTitle(), 500);
    });
  }

  cleanup(){
    if (this.ended) return;
    process.stdin.setRawMode(this.rawState);
    process.stdin.unpipe(this.pty);
    process.stdin.pause();
    this.pty.kill();
    this.worker.end();
    clearTimeout(this.titlePoll);
    this.ended = true;
  }

  complete(){
    let complete = () => {
      this.emit('process');
      this.worker.complete()
      .then(obj => {
        this.emit('complete', new Buffer(obj));
        this.cleanup();
      })
      .catch(err => this.emit(err));
    };

    if (this.pendingFrame.length) {
      this.once('flush', complete);
    } else {
      complete();
    }
  }

  // takes the buffer of instructions
  compress(){
    let buf = this.buffer;

    // frames we're gonna merge
    let add = [];
    let dur = 1000 / this.fps;
    let anchor = +buf[0].at;

    let cnt = Math.ceil((buf[buf.length - 1].at - buf[0].at) / dur);
    for (let i = 0; i < cnt; i++) {
      let add = [];
      for (var f = 0; f < buf.length; f++) {
        let frame = buf[f];
        if (+frame.at <= anchor) {
          add.push(frame);
        } else {
          break;
        }
      }

      if (add.length) {
        buf.splice(0, f);
        this.frames.push(add.reduce((prev, next) => {
          if (!prev.at) prev.at = next.at;
          prev.data = (prev.data || '') + next.data;
          return prev;
        }, {}));
      }
      anchor += dur;
    }
  }

}
