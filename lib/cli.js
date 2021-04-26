#!/usr/bin/env node

const path = require('path');
const vers = require('./vers.js');
const { Command } = require('commander');

function main() {
    (async function () {
        const version = require(path.join(__dirname, '..', 'package.json')).version;

        const prog = new Command('vers')
            .option('-t, --git-tag-prefix <prefix>', 'tag prefix for versioning')
            .option('-c, --cwd <path>', 'working directory', './')
            .version(version, '-v, --version', 'output the current version')
            .passThroughOptions(true);

        prog.command('publish')
            .option('--tag <tag>', 'registers the published package with the given tag (latest); see `npm help publish`')
            .option('--access <public|restricted>', 'tells the registry whether this package should be published as public or restricted; see `npm help publish`')
            .option('--otp <otpcode>', 'two-factor authentication code; see `npm help publish`')
            .option('--dry-run', 'does everything publish would do except actually publishing to the registry; see `npm help publish`')
            .action(cmdPublish);

        prog.command('version')
            .option('--minor <minor>', '', )
            .action(cmdVersion);

        await prog.parseAsync(process.argv);
    })();
}

async function cmdPublish(options, command) {
    const globOptions = command.parent.opts();
    //const gitRoot = await vers.gitFindRoot('.');
    //console.log(gitRoot);

    //await vers.manifestSetVersion('.', '1.0.3-dev-6');
    await vers.npmPublish(globOptions.cwd, '1.0.6-dev-5', options);
}

async function cmdVersion(options, command) {
    console.log(options)

    //await vers.manifestSetVersion('.', '1.0.3-dev-6');
}

main();
