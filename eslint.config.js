'use strict';

const { createConfig }  = require('@origin-1/eslint-config');
const globals           = require('globals');

module.exports =
createConfig
(
    { languageOptions: { globals: globals.node } },
    {
        files:              ['*.js'],
        jsVersion:          5,
        ignores:            ['eslint.config.js'],
        languageOptions:    { sourceType: 'commonjs' },
        rules:              { 'no-redeclare': 'off' },
    },
    {
        files:              ['eslint.config.js'],
        jsVersion:          2024,
        languageOptions:    { sourceType: 'commonjs' },
    },
    {
        files:              ['*.ts'],
        tsVersion:          '4.0.0',
        languageOptions:    { parserOptions: { project: 'tsconfig.json' } },
    },
    {
        files:              ['dev'],
        jsVersion:          2024,
    },
);
