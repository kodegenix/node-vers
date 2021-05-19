const { exec } = require('child_process');

async function cmdExec(cmd, options) {
    options = options || {}
    options.windowHide = true
    options.stdio = 'pipe'
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
        super(message);
        this.name = this.constructor.name;
        this.error = error
        this.output = {
            out: out,
            err: err,
        }
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    cmdExec,
    VersError,
}