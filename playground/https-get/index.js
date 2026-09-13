'use strict';

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
