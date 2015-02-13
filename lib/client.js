
// deps
var Terminal = require('term.js');

// rpc
var _ = window._  = {};

// term ref
var term;

// dom
var style = document.createElement('style');
style.innerText = [
  '* {',
    'margin: 0;',
    'padding: 0;',
    'box-sizing: border-box;',
  '}',
  '.terminal {',
    'font-family: Menlo, monospace;',
    'font-size: 11px;',
  '}',
  '.toolbar {',
    'height: 20px;',
    'line-height: 20px;',
    'vertical-align: middle;',
    'background: #DEDEDE;',
    'text-align: center;',
  '}',
  '.toolbar > div {',
    'vertical-align: middle;',
    'height: 20px;',
    'line-height: 20px;',
    'font-family: Menlo, Monaco, monospace;',
  '}',
  '.toolbar .title {',
    'color: #4A4A4A;',
    'font-size: 10px;',
    'width: 50%;',
    'margin: auto;',
  '}',
  '.toolbar .credits {',
    'color: #A9A9A9;',
    'font-size: 9px;',
    'float: right;',
    'padding-right: 6px;',
  '}',
  '.balls {',
    'float: left;',
    'padding-left: 6px;',
  '}',
  '.ball {',
    'display: inline-block;',
    'width: 10px;',
    'height: 10px;',
    'border-radius: 100%;',
    'margin-right: 4px;',
  '}',
  '.keys {',
    'height: 20px;',
    'line-height: 20px;',
    'vertical-align: middle;',
    'background: #4A4A4A;',
    'margin-right: 4px;',
    'font-family: Menlo, Monaco, monospace;',
    'font-size: 10px;',
    'padding: 0 6px;',
  '}',
  '.keys :first-child {',
    'color: #DEDEDE;',
  '}',
  '.keys :nth-child(2) {',
    'color: #9C9C9C;',
  '}',
  '.keys :nth-child(3) {',
    'color: #8E8F8E;',
  '}',
].join('');
var div = document.createElement('div');

// whether the title was user set
// through xterm ansi escapes
var userTitle = false;

// set up terminal
_.setup = function(opts){
  document.body.appendChild(style);
  document.body.appendChild(div);

  term = new Terminal({
    rows: opts.rows,
    cols: opts.cols,
    useStyle: true,
    screenKeys: opts.screenKeys,
    cursorBlink: false
  });
  term.open(div);

  var w = div.childNodes[0].offsetWidth + 'px';

  if (opts.toolbar) {
    var bar = toolbar(opts.version);
    bar.style.width = w;
    document.body.insertBefore(bar, div);
    term._toolbar = bar;

    term.on('title', function(title){
      userTitle = true;
      bar._title.innerText = title;
    });
  }

  if (opts.keys) {
    var keys = document.createElement('div');
    keys.style.width = w;
    keys.className = 'keys';
    term._keys = keys;
  }
};

// receive frame
_.frame = function(frame){
  term.write(frame.data);
  var keys = frame.keys;
  if (keys.length && term._keys) {
    var el = term._keys;

    var span = document.createElement('span');
    span.innerText = keys.map(function(key){
      // modifier
      var mod = '';
      if (key.ctrl) mod += 'ctrl+';
      if (key.shift) mod += 'shift+';
      if (key.meta) mod += 'meta+';

      // key
      var name = key.name;
      if (name == 'return') name = '↵';

      return mod + name;
    }).join(' ');

    if (el.childNodes.length) {
      el.insertBefore(span, el.childNodes[0]);
    } else {
      el.appendChild(span);
    }

    // trim to first 3
    for (var i = 3; i < el.childNodes.length; i++) {
      var child = el.childNodes[i];
      child.parentNode.removeChild(child);
    }
  }
};

// set the title
_.title = function(title){
  if (!userTitle) {
    term._toolbar._title.innerText = title;
  }
};

// create toolbar
function toolbar(version){
  var bar = document.createElement('div');
  bar.className = 'toolbar';

  var balls = document.createElement('div');
  balls.className = 'balls';
  balls.appendChild(ball('#999'));
  balls.appendChild(ball('#999'));
  balls.appendChild(ball('#999'));
  bar.appendChild(balls);

  var credits = document.createElement('div');
  credits.className = 'credits';
  credits.innerText = 'clif ' + version;
  bar.appendChild(credits);

  var title = document.createElement('div');
  title.className = 'title';
  bar._title = title;
  bar.appendChild(title);

  function ball(color){
    var div = document.createElement('div');
    div.className = 'ball';
    div.style.backgroundColor = color;
    return div;
  }

  return bar;
}
