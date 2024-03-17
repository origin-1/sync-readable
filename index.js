'use strict';

var PassThrough = require('stream').PassThrough;

function copyStateProperties(src, dest)
{
    dest.highWaterMark  = src.highWaterMark;
    dest.objectMode     = src.objectMode;
}

function createOnFulfilled(outStream)
{
    return function (inStream)
    {
        copyStateProperties(inStream._readableState, outStream._readableState);
        copyStateProperties(inStream._writableState, outStream._writableState);
        inStream.pipe(outStream);
        inStream.on
        (
            'close',
            function ()
            {
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
