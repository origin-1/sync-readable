'use strict';

var OBJECT_MODE_HIGH_WATER_MARK = 16;

var PassThrough = require('stream').PassThrough;

function configureState(inState, outState)
{
    if (inState)
    {
        var highWaterMark   = inState.highWaterMark;
        var objectMode      = inState.objectMode;
    }
    if (typeof highWaterMark === 'number' && typeof objectMode === 'boolean')
        outState.highWaterMark = highWaterMark;
    // Don't assign a default highWaterMark for byte mode streams.
    else if (objectMode !== false)
        outState.highWaterMark = OBJECT_MODE_HIGH_WATER_MARK;
    if (typeof objectMode !== 'boolean')
        objectMode = true;
    outState.objectMode = objectMode;
}

function createOnFulfilled(outStream)
{
    return function (inStream)
    {
        var inReadableState     = inStream._readableState;
        var outReadableState    = outStream._readableState;
        var outWritableState    = outStream._writableState;
        configureState(inReadableState, outReadableState);
        configureState(inReadableState, outWritableState);
        inStream.pipe(outStream);
        inStream.on
        (
            'close',
            function ()
            {
                if (!outWritableState.ended || !outReadableState.length && !outWritableState.length)
                    outStream.destroy();
            }
        );
        inStream.on
        (
            'error',
            function (error)
            {
                outStream.emit('error', error);
            }
        );
    };
}

function createOnRejected(outStream)
{
    return function (error)
    {
        outStream.destroy(error);
    };
}

// Polyfill for Node.js < 8
function streamDestroyPolyfill(error)
{
    if (!this.destroyed)
    {
        this.destroyed = true;
        var stream = this;
        process.nextTick
        (
            function ()
            {
                if (error != null)
                    stream.emit('error', error);
                stream.emit('close');
            }
        );
    }
    return this;
}

module.exports =
function (fn)
{
    return function ()
    {
        var outStream = new PassThrough();
        if (typeof outStream.destroy !== 'function') outStream.destroy = streamDestroyPolyfill;
        fn.apply(this, arguments).then(createOnFulfilled(outStream), createOnRejected(outStream));
        return outStream;
    };
};
