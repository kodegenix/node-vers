#!/usr/bin/env node

const path = require('path')
const { Command } = require('commander')

const git = require('./git')
const ver = require('./ver')

function main() {
    (async function () {
        const version = require(path.join(__dirname, '..', 'package.json')).version

        const prog = new Command('vers')
            .option('-t, --git-tag-prefix <prefix>', 'tag prefix for versioning')
            .option('-c, --cwd <path>', 'working directory', './')
            .version(version, '-v, --version', 'output the current version')
            .passThroughOptions(true)

        prog.command('publish')
            .option('--tag <tag>', 'registers the published package with the given tag (latest); see `npm help publish`')
            .option('--access <public|restricted>', 'tells the registry whether this package should be published as public or restricted; see `npm help publish`')
            .option('--otp <otpcode>', 'two-factor authentication code; see `npm help publish`')
            .option('--dry-run', 'does everything publish would do except actually publishing to the registry; see `npm help publish`')
            .action(runCommand)

        prog.command('ver')
            .option('--minor <minor>', '', )
            .action(runCommand)

        await prog.parseAsync(process.argv);
    })();
}

async function runCommand() {
    const command = this
    const options = command.parent.opts()

    if (options.cwd) {
        process.chdir(options.cwd)
    }
    const cmd = command.name()
    switch (cmd) {
        case 'publish': return cmdPublish(options, command)
        case 'ver': return cmdVer(options, command)
        default: throw new Error(`unknown command: '${cmd}'`)
    }
}

async function cmdPublish(options, command) {

}

async function cmdVer(options, command) {
    let tagPrefix = options.gitTagPrefix
    if (tagPrefix == null) {
        const gitRoot = await git.gitFindRoot()
        const cwd = process.cwd()
        try {
            process.chdir(gitRoot)
            tagPrefix = path.relative(gitRoot, cwd)
        }
        catch (err) {
            throw err
        }
        finally {
            process.chdir(cwd)
        }
    }

    const ver = await git.gitGetVersion(tagPrefix)
    console.log(ver)
}

main();
