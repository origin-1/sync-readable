import 'node';

/**
 * Converts a function that returns a `Promise` of a `ReadableStream` into a function that returns a
 * `ReadableStream`.
 *
 * @param fn
 *
 * A function that returns a `Promise` of a `ReadableStream`.
 *
 * @returns
 *
 * A function that returns a `ReadableStream`.
 */
declare function syncReadable<ArgumentListType extends any[]>
(fn: (...args: ArgumentListType) => Promise<NodeJS.ReadableStream>):
(...args: ArgumentListType) => NodeJS.ReadableStream;

export = syncReadable;
