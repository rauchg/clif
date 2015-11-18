
// import polyfills because the child
// process will require this same file
require('babel-polyfill');

import { fork } from 'child_process';
import { EventEmitter }  from 'events';

export default function toWorker(path){
  // TODO: dont rely on dynamic requires and
  // subsitute with `import` and perhaps
  // a compilation step
  let mod = require(path).default;

  let count = 0;
  let privates = new WeakMap;

  class Worker extends EventEmitter {
    constructor(){
      super();

      let child = fork(require.resolve('./to-worker'));
      let args = Array.from(arguments);
      let acks = new EventEmitter;

      // privates
      let priv = {};
      priv.child = child;
      priv.acks = acks;
      privates.set(this, priv);

      child.send({ construct: args, path });

      child.on('error', err => {
        acks.removeAllListeners();
        if (privates.get(this).ended) return;
        this.emit('error', err);
      });

      child.on('exit', () => {
        acks.removeAllListeners();
        if (privates.get(this).ended) return;
        privates.get(this).ended = true;
        this.emit('error', new Error('Unexpected worker exit'));
      });

      child.on('message', ack => {
        acks.emit(ack.id, ack);
      });
    }

    end(){
      let priv = privates.get(this);
      if (priv.ended) return;
      priv.ended = true;
      priv.child.kill();
    }
  }

  let methods = Object.getOwnPropertyNames(mod.prototype);
  methods.forEach(method => {
    // ignore privates
    if ('_' != method[0] || 'constructor' != method) {
      Worker.prototype[method] = function(){
        let priv = privates.get(this);

        if (priv.ended) {
          return new Promise((resolve, reject) => {
            reject(new Error('Worker is already ended'));
          });
        }

        let id = count++;
        let args = Array.from(arguments);
        let acks = priv.acks;
        let child = priv.child;

        child.send({ args, method, id: id });

        return new Promise((resolve, reject) => {
          acks.once(id, ack => {
            if (ack.error) {
              let err = new Error;
              for (let i in ack.error) {
                err[i] = ack.error[i];
              }
              reject(err);
            } else if (ack.rejection) {
              reject(ack.val);
            } else {
              resolve(ack.val);
            }
          });
        });
      };
    }
  });

  return Worker;
}

if (!module.parent) {
  // this is executed when running standalone
  let obj;

  process.on('message', msg => {
    let ret;

    if (msg.construct) {
      // TODO: dont rely on dynamic requires and
      // subsitute with `import` and perhaps
      // a compilation step
      let mod = require(msg.path).default;
      obj = new mod(...msg.construct);
    }

    if (msg.method) {
      if (!obj) throw new Error('Not built');
      ret = obj[msg.method](...msg.args);
    }

    if (null != msg.id) {
      if (ret instanceof Promise) {
        ret.then(val => {
          process.send({ id: msg.id, val: val });
        });
        ret.catch(err => {
          if (err instanceof Error) {
            let obj = {
              message: err.message,
              stack: err.stack
            };
            for (let i in err) obj[i] = err[i];
            process.send({ id: msg.id, error: obj });
          } else {
            process.send({ id: msg.id, rejection: err });
          }
        });
      } else {
        process.send({ id: msg.id, val: ret });
      }
    }
  });
}
