#!/usr/bin/env node
const path = require('path')
const { Command, Option } = require('commander')

const git = require('./git')
const npm = require('./npm')
const cargo = require('./cargo')
const { version, VersError } = require('./commons')

async function main() {
    const ver = require(path.join(__dirname, '..', 'package.json')).version

    const prog = new Command('vers')
        .usage('[options] [command]')
        .option('-t, --git-tag-prefix <prefix>', 'git tag prefix for versioning, by default path from git root directory')
        .option('-p, --pre-release <pre>', 'pre-release identifier to add when there are commits after full version tag', 'dev')
        .option('-g, --git-hash', 'git commit hash is added as build info to the version', false)
        .option('-c, --cwd <path>', 'working directory', './')
        .option('-P, --git-paths <path...>', 'paths to search git commits for', './')
        .option('-N, --no-manifest', 'do not try to resolve version from any supported manifests')
        .addOption(new Option('-m, --manifest-type <type...>', 'manifest types to try to get a version from')
            .choices(['npm', 'cargo']))
        .option('-F, --fallback <semver>', 'fallback version number if none could be found in package manifest nor git tags', '0.0.0')
        .version(ver, '-v, --version', 'output current version')

    prog.command('ver', { isDefault: true })
        .description('display calculated version from git annotated tag')
        .action(runCommand)

    prog.command('publish')
        .description('publish package to the repository with version calculated from git annotated tag')
        .option('-e, --check', 'if the package already exists with calculated version in the registry, silently ignore publishing', false)
        .option('--tag <tag>', 'registers the published package with the given tag (latest); see `npm help publish`')
        .option('--name <name>', 'publishes package with the given name')
        .option('--access <public|restricted>', 'tells the registry whether this package should be published as public or restricted; see `npm help publish`')
        .option('--otp <otpcode>', 'two-factor authentication code; see `npm help publish`')
        .option('--dry-run', 'does everything publish would do except actually publishing to the registry; see `npm help publish`')
        .action(runCommand)

    if (process.env.VERS_PATH) {
        process.env.PATH = process.env.VERS_PATH + path.delimiter + process.env.PATH
    }

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
    await npm.npmPublish(v, options)
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

    let paths = globals.gitPaths
    if (!paths) {
        paths = [ process.cwd() ]
    } else if (!(paths instanceof Array)) {
        paths = [ paths ]
    }

    let ver = globals.fallback
    if (globals.manifest) {
        const types = globals.manifestType || ['npm', 'cargo']
        loop: for (let t of types) {
            try {
                switch (t) {
                    case 'npm': {
                        const m = await npm.manifestRead()
                        if (m) {
                            ver = m.version
                            break loop
                        }
                        break
                    }
                    case 'cargo': {
                        const m = await cargo.manifestRead()
                        if (m) {
                            ver = m.packages[0].version
                            break loop
                        }
                        break
                    }
                }
            }
            catch (err) {
                // ignore manifest read errors
                continue
            }
        }
    }
    try {
        ver = version.parse(ver)
    }
    catch (err) {
        throw `Invalid fallback version: ${ver}`
    }

    ver = await git.gitGetVersion(ver, tagPrefix, globals.preRelease, paths)

    if (globals.gitHash) {
        return ver.raw
    } else {
        return ver.toString()
    }
}

main().catch(console.error)
