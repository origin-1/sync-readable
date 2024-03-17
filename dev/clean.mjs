#!/usr/bin/env node

import { rm } from 'node:fs/promises';

const url = new URL('../coverage', import.meta.url);
await rm(url, { force: true, recursive: true });
