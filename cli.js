#!/usr/bin/env node

const vers = require('./vers.js');
const { Command } = require('commander');

function main() {
    (async function () {
        const command = new Command('vers')
            .option('-t, --tag-prefix', 'tag prefix for versioning')
            .action(exec)
            .parseAsync(process.argv)
    })();
}

async function exec(options) {
    console.log('opts:', options)

    const gitRoot = await vers.gitFindRoot('.');
    console.log(gitRoot);
    /*const tag = await findTag('')
    const count = await countCommits(tag[1], null, '.')

    console.log(tag)
    console.log(count)*/
}

main();
