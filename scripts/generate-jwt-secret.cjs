#!/usr/bin/env node
'use strict';

var crypto = require('crypto');
var secret = crypto.randomBytes(48).toString('base64url');

console.log('JWT_SECRET gerado (copie para Railway / .env):\n');
console.log(secret);
console.log('\nNão commite este valor no repositório.');
