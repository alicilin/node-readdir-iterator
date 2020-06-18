'use strict';
const rdi = require('./index');

async function main() {
    for await(let p of rdi({ p: './', f: /js/i, recursive: true })){
        console.log(p);
    }
}

main();
