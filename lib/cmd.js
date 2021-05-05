const { exec } = require('child_process');

module.exports = {
    cmdExec:  async function (cmd, options) {
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
}