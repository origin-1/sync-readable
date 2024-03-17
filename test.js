/* global Promise after, before, describe it */

'use strict';

var assert          = require('assert');
var stream          = require('stream');
var syncReadable    = require('./index');
require('es6-promise/auto');

var Duplex          = stream.Duplex;
var Transform       = stream.Transform;

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

var createRejection = Promise.reject.bind(Promise);

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

describe
(
    'sync-readable',
    function ()
    {
        it
        (
            'emits data from the input stream',
            function (callback)
            {
                var expectedDataList = [42, 'foo', { bar: 'baz' }];

                var stream = syncReadable(createDataStreamAsync)(expectedDataList);

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
                        var dataListLength = expectedDataList.length;
                        assert.strictEqual(actualDataList.length, expectedDataList.length);
                        for (var index = 0; index < dataListLength; ++index)
                        {
                            var actualData      = actualDataList[index];
                            var expectedData    = expectedDataList[index];
                            assert.strictEqual
                            (
                                actualData,
                                expectedData,
                                'data at index ' + index + ' does not match'
                            );
                        }
                        callback();
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
                var actualReturnValue = streamDestroyPolyfill.call(stream, Error('Boom!'));
                assert.strictEqual(actualReturnValue, stream);
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
                var actualReturnValue = streamDestroyPolyfill.call(stream);
                assert.strictEqual(actualReturnValue, stream);
                var actualReturnValue = streamDestroyPolyfill.call(stream, Error('Boom!'));
                assert.strictEqual(actualReturnValue, stream);
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
