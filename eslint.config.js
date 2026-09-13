'use strict';

const { createConfig }      = require('@origin-1/eslint-config');
const eslintPluginOrigin1   = require('@origin-1/eslint-plugin');
const globals               = require('globals');

module.exports =
createConfig
(
    { ignores: ['coverage', 'playground/gulp/jsdoc'] },
    { languageOptions: { globals: globals.node } },
    {
        files:              ['*.js'],
        jsVersion:          5,
        ignores:            ['eslint.config.js'],
        languageOptions:    { sourceType: 'commonjs' },
    },
    {
        files:              ['eslint.config.js'],
        jsVersion:          2024,
        languageOptions:    { sourceType: 'commonjs' },
    },
    {
        files:              ['*.ts'],
        tsVersion:          '2.0.0',
    },
    {
        files:              ['dev'],
        jsVersion:          2024,
    },
    {
        files:              ['playground/**/*.js'],
        jsVersion:          2024,
        languageOptions:    { sourceType: 'commonjs' },
        rules:
        {
            'n/no-unpublished-import':  'off',
            'n/no-unpublished-require': 'off',
        },
    },
    {
        files:              ['**/*.json'],
        jsonVersion:        'standard',
    },
    {
        files:              ['**/package.json'],
        plugins:            { origin1: eslintPluginOrigin1 },
        rules:              { 'origin1/package-json-fields': 'error' },
    },
);
