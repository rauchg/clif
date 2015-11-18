
# clif

Cross-platform CLI GIF maker based on JS+Web.

![](https://cldup.com/Iu3VmK9SVy.gif)

## How to use

Run

```bash
$ clif out.gif
```

type `exit` to finish and save the recording.

## Features

- Easy to install: `npm install -g clif`.
- Works on OSX and Linux.
- Small GIFs.
- High quality (anti-aliased fonts).
- Rendered with CSS/JS, customizable.
- Realtime parallel rendering.
- Frame aggregation and customizable FPS.
- Support for titles Terminal.app-style.

## How it works

clif builds mainly on four projects: `child_pty`, `term.js`
`omggif` and `phantomjs`.

`child_pty` is used to spawn a pseudo terminal from
which we can capture the entirety of input and output.

Each frame that's captured is asynchronously sent to
a `phantomjs` headless browser to render using `term.js`
and screenshot.

The GIF is composited with `omggif` and finally written
out to the filesystem.

## Options

```

  Usage: clif [options] <outfile>

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -c, --cols <cols>    Cols of the term [90]
    -r, --rows <rows>    Rows of the term [30]
    -s, --shell <shell>  Shell to use [/bin/bash]
    -f, --fps <fps>      Frames per second [8]
    -q, --quality <q>    Frame quality 1-30 (1 = best|slowest) [5]

```

## TODO

- Substitute `phantom` with a terminal rendered on top
  of `node-canvas` or low-level graphic APIs.
  [terminal.js](https://github.com/Gottox/terminal.js) seems like a good
  candidate to add a `<canvas>` adaptor to.
- Should work on Windows with some minor tweaks.

## Credits

- Inspired by [KeyboardFire](https://github.com/KeyboardFire)'s [mkcast](https://github.com/KeyboardFire/mkcast).
- Borrows GIF palette neuquant indexing from
  [sole](https://github.com/sole)'s [animated_GIF.js](https://github.com/sole/Animated_GIF).

## License

MIT
