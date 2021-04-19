const { exec } = require('child_process');

async function cmdExec(cmd, cwd, outputFn) {
    return new Promise((resolve, reject) => {
        exec(cmd, {
            cwd: cwd,
            windowHide: true,
        }, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            } else {
                resolve(outputFn(stdout))
            }
        })
    });
}

module.exports = {
    gitFindRoot: async function (cwd) {
        return cmdExec(`git rev-parse --show-toplevel`, cwd,
                out => out.toString());
    },
    gitFindTag: async function (cwd, tagPrefix) {
        return cmdExec(`git tag --list --format='%(refname:short):|:%(object)' '${tagPrefix}*'`, cwd,
                out => out.toString().trim().split(':|:'));
    },
    gitCountCommits: async function (cwd, startCommit, endCommit, subpath) {
        return cmdExec(`git log ${startCommit}..${endCommit ? endCommit : ''} --format='%H' -- ${subpath}`, cwd,
            out => out.toString().trim().split('\n').length);
    }
}
