const { exec } = require('child_process')
const semver = require('semver')

const semverOptions = {
    loose: false,
    includePrerelease: true,
    rtl: false,
}

const version = {
    parse: ver => semver.parse(ver, semverOptions, true),
    coerce: ver => semver.coerce(ver, semverOptions),
    valid: ver => semver.valid(ver),
    compare: (v1, v2, desc) => desc ? semver.compare(v2, v1) : semver.compare(v1, v2),
    print: (v, prerelease, build) => {
        let s = `${v.major || 0}.${v.minor || 0}.${v.patch || 0}`
        if (prerelease && v.prerelease.length) {
            for (let p = 0; p < v.prerelease.length; ++p) {
                s += (p === 0 ? '-' : '.') + v.prerelease[p]
            }
        }
        if (build && v.build.length) {
            for (let b = 0; b < v.build.length; ++b) {
                s += (b === 0 ? '+' : '.') + v.build[b]
            }
        }
        return s
    }
}

async function cmdExec(cmd, options) {
    options = options || {}
    options.windowHide = true
    options.stdio = 'pipe'
    options.shell = process.env.SHELL || undefined
    return new Promise((resolve, reject) => {
        exec(cmd, options, (error, stdout, stderr) => {
            let out = stdout.toString('utf8')
            let err = stderr.toString('utf8')
            if (error) {
                reject(new VersError(null, error, out, err))
            } else {
                resolve({ out, err })
            }
        })
    });
}

class VersError extends Error {
    constructor(message, error, out, err) {
        super(message || (error ? error.message : "Unknown error"))
        this.name = this.constructor.name
        this.error = error
        this.code = isFinite(error.code) ? error.code : -1
        this.output = {
            out: out,
            err: err,
        }
        Error.captureStackTrace(this, this.constructor)
    }
}

module.exports = {
    cmdExec,
    version,
    VersError,
}