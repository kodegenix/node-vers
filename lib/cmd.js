const { exec } = require('child_process');

module.exports = {
    cmdExec:  async function (cmd, cwd, outputFn) {
        return new Promise((resolve, reject) => {
            exec(cmd, {
                cwd: cwd,
                windowHide: true,
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(outputFn(stdout, stderr))
                }
            })
        });
    }
}