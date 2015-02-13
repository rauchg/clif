/*global phantom*/

var system = require('system');
if (system.args.length === 1) {
  console.log('missing args');
  phantom.exit();
}
var port = system.args[1];
var page = require('webpage').create();
var _ = {};
var ws;

page.open('http://localhost:' + port, function(status){
  if ('success' != status) {
    console.log('page open problem');
    phantom.exit();
  }

  ws = new WebSocket('ws://localhost:' + port);
  ws.onmessage = function(ev){
    var packet = JSON.parse(ev.data);
    var name = packet[0];
    var args = packet[1];
    _[name].apply(_, args);
  };
});

_.setup = function(opts){
  call('setup', [opts]);
  emit('setup');
};

_.frame = function(frame, file){
  call('frame', [frame]);
  page.render(file);
  emit('frame');
};

_.title = function(title){
  call('title', [title]);
  emit('title');
};

// respond to node.js
function emit(event, params){
  var packet = JSON.stringify([event, params]);
  ws.send(packet);
}

// call to loaded page
function call(fn, params){
  var json = JSON.stringify(params)
  .replace("\u2028", "\\u2028")
  .replace("\u2029", "\\u2029");
  var js = 'function(){_.' + fn + '.apply(null, ' + json + ')}';
  page.evaluateJavaScript(js);
}
