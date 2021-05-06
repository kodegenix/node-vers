const { exec } = require('child_process');

async function cmdExec(cmd, options) {
    options = options || {};
    options.windowHide = true;
    return new Promise((resolve, reject) => {
        exec(cmd, options, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            } else {
                resolve({ out: stdout.toString('utf8'), err: stderr.toString('utf8') })
            }
        })
    });
}

class VersError extends Error {
    constructor(message, code) {
        super(message);
        this.code = Number.isFinite(code) ? Number.parseInt(code) : -1
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    cmdExec,
    VersError,
}