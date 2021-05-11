#!/usr/bin/env node

const path = require('path')
const { Command } = require('commander')

const git = require('./git')
const ver = require('./ver')
const { VersError } = require('./commons')

async function main() {
    const version = require(path.join(__dirname, '..', 'package.json')).version

    const prog = new Command('vers')
        .usage('[options] <command>')
        .option('-t, --git-tag-prefix <prefix>', 'git tag prefix for versioning, by default path from git root directory')
        .option('-p, --pre-release <pre>', 'pre-release identifier to add when there are commits after full version tag', 'dev')
        .option('-g, --git-hash', 'git commit hash is added as build info to the version', false)
        .option('-c, --cwd <path>', 'working directory', './')
        .version(version, '-v, --version', 'output the current version')
    //.passThroughOptions(true)

    prog.command('publish')
        .description('publish package to the repository with version calculated from git annotated tag')
        .option('-e, --check', 'if the package already exists with calculated version in the registry, silently ignore publishing', false)
        .option('--tag <tag>', 'registers the published package with the given tag (latest); see `npm help publish`')
        .option('--access <public|restricted>', 'tells the registry whether this package should be published as public or restricted; see `npm help publish`')
        .option('--otp <otpcode>', 'two-factor authentication code; see `npm help publish`')
        .option('--dry-run', 'does everything publish would do except actually publishing to the registry; see `npm help publish`')
        .action(runCommand)

    prog.command('ver')
        .description('display calculated version from git annotated tag')
        .action(runCommand)

    try {
        await prog.parseAsync(process.argv)
    } catch (err) {
        if (err instanceof VersError) {
            console.error(err.message)
            process.exit(err.code)
        } else {
            console.error(err)
            process.exit(-1)
        }
    }
}

async function runCommand() {
    const command = this
    const options = command.opts()
    const globals = command.parent.opts()

    if (globals.cwd) {
        process.chdir(globals.cwd)
    }
    const cmd = command.name()
    let res;
    switch (cmd) {
        case 'publish':
            res = await cmdPublish(globals, options)
            break
        case 'ver':
            res = await cmdVer(globals, options)
            break
        default:
            throw new Error(`Unknown command: '${cmd}'`)
    }
    if (res) {
        console.log(res.toString())
    }
}

async function cmdPublish(globals, options) {
    const v = await cmdVer(globals, {})

    if (options.check) {
        const manifest = await ver.manifestRead()
        const exists = await ver.npmView(manifest.name, v)
        if (exists) {
            console.log(`package '${manifest.name}@${v}' already exists in repository, nothing to do.`)
            return
        }
    }
    await ver.npmPublish(v, options)
}

async function cmdVer(globals, options) {
    let tagPrefix = globals.gitTagPrefix
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

    const ver = await git.gitGetVersion(tagPrefix, globals.preRelease)
    if (globals.gitHash) {
        return ver.raw
    } else {
        return ver.toString()
    }
}

main().catch(console.error)
