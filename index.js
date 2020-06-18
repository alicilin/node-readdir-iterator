'use strict';
const path = require('path');
const spawn = require('child_process').spawn;
const os = require('os');
const supos = { freebsd: 'unix', darwin: 'unix', openbsd: 'unix', linux: 'linux', win32: 'windows' };
const spawners = { };
const RE_NEWLINE = /\r?\n$/u;
//------------------------------------------------------------------
function chomp(line) {
    let match = RE_NEWLINE.exec(line);
    if (!match) return line;
    return line.slice(0, match.index);
}
//------------------------------------------------------------------
async function* chunksToLinesAsync(chunks) {
    if (!Symbol.asyncIterator) {
        throw new Error('Current JavaScript engine does not support asynchronous iterables');
    }
    
    if (!(Symbol.asyncIterator in chunks)) {
        throw new Error('Parameter is not an asynchronous iterable');
    }

    let previous = '';
    for await (let chunk of chunks) {
        previous += chunk;
        let eolIndex;
        while ((eolIndex = previous.indexOf('\n')) >= 0) {
            let line = previous.slice(0, eolIndex + 1);
            yield line;
            previous = previous.slice(eolIndex + 1);
        }
    }
    
    if (previous.length > 0) {
        yield previous;
    }
}


//------------------------------------------------------------------

const linux = (path, recursive = false) => {
    let args = [`"${path}"`, '-path', `"${path}/*"`];
    if(recursive === false) args.push('-maxdepth', '1');
    return spawn('find', args, { shell: true });
}
//-------------------------------------------------------------------
const windows = (path, recursive = false) => {
    let args = [`"${path}"`, '/b'];
    if (recursive === true) args.push('/s');
    return spawn('dir', args, { shell: true });
}
//-------------------------------------------------------------------
spawners.unix = linux;
spawners.linux = linux;
spawners.windows = windows;
//--------------------------------------------------------------------
async function *rdi({ p = './', f = null, recursive = false }){ 
    if (!( os.platform() in supos )) throw new Error('unspported os');
    if (p.slice(0, 1) === '.') p = path.resolve(module.parent.path, p);
    
    let errors = [];    
    let find = spawners[supos[os.platform()]](p, recursive);
    
    for await (let chunk of chunksToLinesAsync(find.stdout)){
        if (f instanceof RegExp){
            if (f.test(chomp(chunk))) yield chomp(chunk);
            continue;
        }
        
        yield chomp(chunk);
    }
    for await (let chunk of chunksToLinesAsync(find.stderr)) errors.push(chomp(chunk))
    if(errors.length > 0) throw new Error(errors.join('\n'));
}
//---------------------------------------------------------------------

module.exports = rdi;