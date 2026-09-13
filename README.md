# sync-readable · [![npm version][npm badge]][npm URL]

A utility to convert a function that returns a `Promise` of a Node.js `ReadableStream` into a function that returns a Node.js `ReadableStream`.
The new function accepts the same arguments as the original function.

## Installation

```console
npm install sync-readable
```

## Examples

### HTTP response stream

`https.get` provides the response stream in a callback.
Promisifying it produces a `Promise` of a stream, and `syncReadable` turns that into a stream that can be piped right away, or passed to a function like [`stream.pipeline`][pipeline URL].

```js
const { get }       = require('node:https');
const syncReadable  = require('sync-readable');

const httpsStream =
syncReadable
(
    url =>
    new Promise
    (
        (resolve, reject) =>
        {
            get(url, resolve).on('error', reject);
        },
    ),
);

httpsStream('https://registry.npmjs.org/sync-readable').pipe(process.stdout);
```

The `url` argument is forwarded to the wrapped function, and a failure to connect is emitted as an `error` event by the returned stream.

### gulp task

A task runner like [gulp][gulp URL] expects a stream from a task.
In this gulpfile, the [gulp-eslint-new][gulp-eslint-new URL] plugin is loaded with a dynamic `import`, which makes the task function asynchronous.
Wrapping the function in `syncReadable` keeps the task returning a stream, so gulp waits for the linting to finish, and the stream can still be piped into another one.

```js
const { src }       = require('gulp');
const syncReadable  = require('sync-readable');

const lint =
syncReadable
(
    async () =>
    {
        const { default: gulpESLintNew } = await import('gulp-eslint-new');

        const stream =
        src('*.js')
        .pipe(gulpESLintNew())
        .pipe(gulpESLintNew.failAfterError());
        return stream;
    },
);

module.exports = { lint };
```

## API

### `syncReadable(fn)`

* **`fn`** — a function that returns a `Promise` of a readable stream.
* **Returns** — a function that returns a readable stream.

The returned function forwards its arguments and its `this` value to `fn`, and returns a new stream immediately, without waiting for the promise.
That stream emits the data of the stream that `fn` resolves to, in the same mode: a stream of objects stays a stream of objects.

If `fn` rejects, or if the stream it resolves to emits an `error` event, the error is emitted by the returned stream.

TypeScript declarations are bundled with the package.

## Compatibility

Node.js 0.10 or later.

[gulp URL]: https://gulpjs.com
[gulp-eslint-new URL]: https://www.npmjs.com/package/gulp-eslint-new
[npm badge]: https://img.shields.io/npm/v/sync-readable?logo=npm
[npm URL]: https://www.npmjs.com/package/sync-readable
[pipeline URL]: https://nodejs.org/api/stream.html#streampipelinestreams-callback
