'use strict';

const { src }       = require('gulp');
const syncReadable  = require('sync-readable');

const jsdoc =
syncReadable
(
    async () =>
    {
        const { default: jsdoc } = await import('gulp-jsdoc3');

        const stream =
        src('index.js', { read: false })
        .pipe
        (
            jsdoc
            (
                {
                    opts:       { destination: 'jsdoc' },
                    plugins:    ['plugins/markdown'],
                    tags:       { allowUnknownTags: false },
                },
            ),
        );
        return stream;
    },
);

const jsdocSync =
() =>
{
    const jsdoc = require('gulp-jsdoc3');

    const stream =
    src('index.js', { read: false })
    .pipe
    (
        jsdoc
        (
            {
                opts:       { destination: 'jsdoc' },
                plugins:    ['plugins/markdown'],
                tags:       { allowUnknownTags: false },
            },
        ),
    );
    return stream;
};

const lint =
syncReadable
(
    async () =>
    {
        const { default: gulpESLintNew } = await import('gulp-eslint-new');

        const stream =
        src('index.js')
        .pipe(gulpESLintNew({ overrideConfigFile: true }))
        .pipe(gulpESLintNew.failAfterError());
        return stream;
    },
);

const lintSync =
() =>
{
    const gulpESLintNew = require('gulp-eslint-new');

    const stream =
    src('index.js')
    .pipe(gulpESLintNew({ overrideConfigFile: true }))
    .pipe(gulpESLintNew.failAfterError());
    return stream;
};

module.exports = { 'jsdoc': jsdoc, 'jsdoc-sync': jsdocSync, lint, 'lint-sync': lintSync };
