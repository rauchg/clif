
import express from 'express';
import browserify from 'browserify-middleware';
import { readFile, unlink } from 'fs';
import { Server as WS } from 'ws';
import { Server as HTTP } from 'http';
import { spawn } from 'child_process';
import { join } from 'path';
import { path as phantom } from 'phantomjs';
import { EventEmitter } from 'events';
import { tmpdir } from 'osenv';
import uid from 'uid2';

export default class Phantom extends EventEmitter {

  constructor({ rows, cols, keys, toolbar }) {
    this.rows = rows;
    this.cols = cols;
    this.keys = keys;
    this.toolbar = toolbar;

    let app = express();
    let http = HTTP(app);
    let ws = new WS({ server: http });

    app.use('/script.js', browserify(join(__dirname, 'client.js')));
    app.get('/', (req, res, next) => {
      res.send(`
        <!doctype html>
        <script src="/script.js"></script>
      `);
    });

    http.listen(err => {
      if (err) return this.emit('error', err);

      let port = http.address().port;

      ws.on('connection', socket => {
        this.onsocket(socket);
      });

      // launch phantom proc
      let proc = spawn(phantom, [
        join(__dirname, '/phantom-page.js'),
        port
      ]);

      proc.stdout.on('data', function(buf){
        console.error(buf.toString());
      });

      proc.stderr.on('data', function(buf){
        console.error(buf.toString());
      });

      this.proc = proc;
    });

    this.http = http;
  }

  frame(frame, fn){
    let file = join(tmpdir(), uid(8) + '.png');
    this.call('frame', [frame, file]);
    this.once('frame', function(){
      readFile(file, (err, buf) => {
        if (err) return this.emit('error', err);
        fn(buf);
        unlink(file);
      });
    });
  }

  title(title, fn){
    this.call('title', [title]);
    this.once('title', fn);
  }

  call(name, params){
    let packet = [name, params];
    this.socket.send(JSON.stringify(packet));
  }

  onsocket(socket){
    this.socket = socket;
    socket.on('message', data => {
      let args = JSON.parse(data);
      this.emit.apply(this, args);
    });
    this.call('setup', [{
      rows: this.rows,
      cols: this.cols,
      keys: this.keys,
      toolbar: this.toolbar,
      version: require('../package').version
    }]);
    this.once('setup', () => {
      this.emit('ready');
    });
  }

  destroy(){
    this.http.close();
    this.proc.kill();
  }

}
