import pkg from '../package';
import program from 'commander';
import Clif from './';
import fs from 'fs';
import path from 'path';
import exec from 'child_process';

const sh = process.env.SHELL || 'bash';

program
.version(pkg.version)
.usage('[options] <outfile>')
.option('-c, --cols <cols>', 'Cols of the term [90]', 90)
.option('-r, --rows <rows>', 'Rows of the term [30]', 30)
.option('-s, --shell <shell>', 'Shell to use [' + sh + ']', sh)
.option('-f, --fps <fps>', 'Frames per second [8]', 8)
.option('-q, --quality <q>', 'Frame quality 1-30 (1 = best|slowest) [5]', 5)
.option('-T, --no-toolbar', 'Don\'t show top bar [false]', false)
//.option('-K, --no-keys', 'No screen keys [false]', false)
.parse(process.argv);

if (program.args.length != 1) {
  program.help();
} else {
  program.file = program.args[0];
}

console.log('');
console.log(' \u001b[91m● Now recording! \u001b[39m');
console.log(' \u001b[90m● Write "exit" to finish the session. \u001b[39m');
console.log('');

const argv = [];

// we're using `bash`?
if (/\bbash$/.test(sh)) {
  const rc = path.resolve(__dirname, '..', 'lib', 'bashrc');
  argv.push('--rcfile', rc);
}

const clif = new Clif({
  argv: argv,
  rows: program.rows,
  cols: program.cols,
  shell: program.shell,
  cwd: process.cwd(),
  fps: program.fps,
  quality: program.quality,
  toolbar: program.toolbar,
  keys: program.keys
});

clif.on('process', function(){
  console.log('');

  if (clif.pending) {
    console.log(' \u001b[90m◷ Recording complete! %d frames left…\u001b[39m', clif.pending);
  } else {
    console.log(' \u001b[90m◷ Recording complete!\u001b[39m');
  }

  process.stdout.write(' ');

  if (clif.pending) {
    clif.on('process frame', function(){
      process.stdout.write('\u001b[90m.\u001b[39m');
    });
  }

  clif.on('complete', function(gif){
    fs.writeFileSync(program.file, gif);
    console.log('\n \u001b[96m✓ Written to "%s".\u001b[39m\n', program.file);
  });
});

process.on('exit', function(){
  clif.cleanup();
});
