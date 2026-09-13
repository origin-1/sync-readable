/* global Promise after, before, describe it */

'use strict';

var assert          = require('assert');
var stream          = require('stream');
var syncReadable    = require('./index');
require('es6-promise/auto');

var Duplex          = stream.Duplex;
var Readable        = stream.Readable;
var Stream          = stream.Stream;
var Transform       = stream.Transform;

function assertDataList(actualDataList, expectedDataList)
{
    var dataListLength = expectedDataList.length;
    assert.strictEqual(actualDataList.length, dataListLength);
    for (var index = 0; index < dataListLength; ++index)
    {
        var actualData      = actualDataList[index];
        var expectedData    = expectedDataList[index];
        assert.strictEqual
        (actualData, expectedData, 'data at index ' + index + ' does not match');
    }
}

function createDataStreamAsync(dataList)
{
    var stream = createDataStreamSync(dataList);
    var promise = Promise.resolve(stream);
    return promise;
}

function createDataStreamSync(dataList)
{
    var stream = new Transform({ objectMode: true, transform: defaultTransform });
    if (!isTransformImplemented(stream._transform))
        stream._transform = defaultTransform;
    var index = 0;
    var intervalId =
    setInterval
    (
        function ()
        {
            if (index < dataList.length)
            {
                var data = dataList[index++];
                stream.write(data);
            }
            else
            {
                clearTimeout(intervalId);
                stream.end();
            }
        },
        1
    );
    return stream;
}

function createErrorStreamAsync(error)
{
    var stream = createErrorStreamSync(error);
    var promise = Promise.resolve(stream);
    return promise;
}

function createErrorStreamSync(error)
{
    var stream = new Transform({ objectMode: true });
    setImmediate
    (
        function ()
        {
            if (typeof stream.destroy === 'function')
                stream.destroy(error);
            else
            {
                stream.emit('error', error);
                stream.emit('close');
            }
        }
    );
    return stream;
}

// A legacy stream with no internal state objects.
// Like other legacy streams, it emits a "close" event immediately after "end".
function createLegacyDataStreamSync(dataList)
{
    var stream = new Stream();
    stream.readable = true;
    var index = 0;
    var intervalId =
    setInterval
    (
        function ()
        {
            if (index < dataList.length)
                stream.emit('data', dataList[index++]);
            else
            {
                clearTimeout(intervalId);
                stream.readable = false;
                stream.emit('end');
                stream.emit('close');
            }
        },
        1
    );
    return stream;
}

// A transform stream with a readable side in object mode and a writable side in byte mode.
function createMixedModeDataStreamAsync(dataList)
{
    var stream = createMixedModeDataStreamSync(dataList);
    var promise = Promise.resolve(stream);
    return promise;
}

function createMixedModeDataStreamSync(dataList)
{
    var dataIndex = 0;
    var transform =
    function (chunk, encoding, callback)
    {
        callback(null, dataList[dataIndex++]);
    };
    var stream = new Transform({ readableObjectMode: true, transform: transform });
    if (stream._transform !== transform)
        stream._transform = transform;
    // The option `readableObjectMode` is not supported in Node.js 0.10.
    stream._readableState.objectMode = true;
    for (var index = 0; index < dataList.length; ++index)
        stream.write('*');
    stream.end();
    return stream;
}

var createPromiseWithResolvers =
(function ()
{
    var withResolvers = Promise.withResolvers;
    if (withResolvers)
        return withResolvers.bind(Promise);
    var createPromiseWithResolvers =
    function ()
    {
        var resolve;
        var reject;
        var promise =
        new Promise
        (
            function (localResolve, localReject)
            {
                resolve = localResolve;
                reject  = localReject;
            }
        );
        var promiseWithResolvers = { promise: promise, resolve: resolve, reject: reject };
        return promiseWithResolvers;
    };
    return createPromiseWithResolvers;
}
)();

// A readable stream with no writable state.
function createReadableDataStreamAsync(dataList)
{
    var stream = createReadableDataStreamSync(dataList);
    var promise = Promise.resolve(stream);
    return promise;
}

function createReadableDataStreamSync(dataList)
{
    var index = 0;
    var read =
    function ()
    {
        this.push(index < dataList.length ? dataList[index++] : null);
    };
    var stream = new Readable({ objectMode: true, read: read });
    if (stream._read !== read)
        stream._read = read;
    return stream;
}

var createRejection = Promise.reject.bind(Promise);

var createResolution = Promise.resolve.bind(Promise);

function defaultTransform(chunk, encoding, callback)
{
    callback(null, chunk);
}

function isTransformImplemented(transform)
{
    var implemented = true;
    var callback = function () { };
    try
    {
        transform(null, null, callback);
    }
    catch (error)
    {
        implemented = false;
    }
    return implemented;
}

function readDataList(stream, expectedDataList, callback)
{
    var actualDataList = [];
    stream.on
    (
        'data',
        function (data) { actualDataList.push(data); }
    );
    stream.on
    (
        'end',
        function ()
        {
            assertDataList(actualDataList, expectedDataList);
            callback();
        }
    );
}

describe
(
    'sync-readable',
    function ()
    {
        it
        (
            'emits data from an input stream',
            function (callback)
            {
                var expectedDataList = [42, 'foo', { bar: 'baz' }];

                var stream = syncReadable(createDataStreamAsync)(expectedDataList);

                readDataList(stream, expectedDataList, callback);
            }
        );

        it
        (
            'emits data from an input stream with no writable state',
            function (callback)
            {
                var expectedDataList = [42, 'foo', { bar: 'baz' }];

                var stream = syncReadable(createReadableDataStreamAsync)(expectedDataList);

                readDataList(stream, expectedDataList, callback);
            }
        );

        it
        (
            'emits data from an input stream with different readable and writable modes',
            function (callback)
            {
                var expectedDataList = [42, 'foo', { bar: 'baz' }];

                var stream = syncReadable(createMixedModeDataStreamAsync)(expectedDataList);

                readDataList(stream, expectedDataList, callback);
            }
        );

        it
        (
            'emits data from a legacy input stream after it has closed',
            function (callback)
            {
                var expectedDataList = [42, 'foo', { bar: 'baz' }];
                var inStream = createLegacyDataStreamSync(expectedDataList);

                var stream = syncReadable(createResolution)(inStream);

                inStream.on
                (
                    'close',
                    function ()
                    {
                        setImmediate
                        (
                            function ()
                            {
                                readDataList(stream, expectedDataList, callback);
                            }
                        );
                    }
                );
            }
        );

        it
        (
            'errors if the input stream errors',
            function (callback)
            {
                var expectedError = Error('Boom!');

                var stream = syncReadable(createErrorStreamAsync)(expectedError);

                var lastEvent;
                stream.on
                (
                    'error',
                    function (actualError)
                    {
                        assert.strictEqual(lastEvent, undefined);
                        lastEvent = 'error';
                        assert.strictEqual(actualError, expectedError);
                    }
                );
                stream.on
                (
                    'close',
                    function ()
                    {
                        assert.strictEqual(lastEvent, 'error');
                        lastEvent = 'close';
                        callback();
                    }
                );
            }
        );

        it
        (
            'errors if the asynchronous function rejects',
            function ()
            {
                var expectedError = Error('Boom!');

                var stream = syncReadable(createRejection)(expectedError);

                // In Node.js 8 and 9, the order of the error and close events is inverted.
                var promiseWithResolversForError = createPromiseWithResolvers();
                stream.on
                (
                    'error',
                    function (actualError)
                    {
                        assert.strictEqual(actualError, expectedError);
                        promiseWithResolversForError.resolve();
                    }
                );
                var promiseWithResolversForClose = createPromiseWithResolvers();
                stream.on
                (
                    'close',
                    function ()
                    {
                        promiseWithResolversForClose.resolve();
                    }
                );
                var promise =
                Promise.all
                ([promiseWithResolversForError.promise, promiseWithResolversForClose.promise]);
                return promise;
            }
        );
    }
);

describe
(
    'streamDestroyPolyfill',
    function ()
    {
        var streamDestroyPolyfill;

        before
        (
            function ()
            {
                var originalCall = Duplex.call;
                try
                {
                    Duplex.call =
                    function ()
                    {
                        Duplex.call = originalCall;
                        var stream = arguments[0];
                        // In newer versions of Node.js, comment out the following line to get the
                        // built-in implementation of PassThrough.prototype.destroy instead of
                        // streamDestroyPolyfill.
                        stream.destroy = null;
                        return originalCall.apply(this, arguments);
                    };
                    var stream = syncReadable(createRejection)();
                    streamDestroyPolyfill = stream.destroy;
                }
                finally
                {
                    Duplex.call = originalCall;
                }
            }
        );

        after
        (
            function ()
            {
                streamDestroyPolyfill = undefined;
            }
        );

        it
        (
            'should emit an error and a close event',
            function (callback)
            {
                var stream = syncReadable(createRejection)();
                var lastEvent;
                stream.on
                (
                    'close',
                    function ()
                    {
                        assert.strictEqual(lastEvent, 'error');
                        lastEvent = 'close';
                    }
                );
                stream.on
                (
                    'error',
                    function ()
                    {
                        assert.strictEqual(lastEvent, undefined);
                        lastEvent = 'error';
                        assert(this.destroyed, 'not expected');
                    }
                );
                assert.strictEqual(streamDestroyPolyfill.call(stream, Error('Boom!')), stream);
                setImmediate
                (
                    function ()
                    {
                        assert.strictEqual(lastEvent, 'close');
                        lastEvent = 'close';
                        callback();
                    }
                );
            }
        );

        it
        (
            'should not emit events on a destroyed stream',
            function (callback)
            {
                var stream = syncReadable(createRejection)();
                var closeEmitted = false;
                stream.on
                (
                    'close',
                    function ()
                    {
                        assert(!closeEmitted, 'not expected');
                        assert(this.destroyed, 'not expected');
                        closeEmitted = true;
                    }
                );
                stream.on
                (
                    'error',
                    function ()
                    {
                        assert.fail('not expected');
                    }
                );
                assert.strictEqual(streamDestroyPolyfill.call(stream), stream);
                assert.strictEqual(streamDestroyPolyfill.call(stream, Error('Boom!')), stream);
                setImmediate
                (
                    function ()
                    {
                        assert(closeEmitted, 'not expected');
                        callback();
                    }
                );
            }
        );
    }
);
