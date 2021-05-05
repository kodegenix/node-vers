const { cmdExec } = require('./cmd');

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
    },
    gitGetVersion: async function () {

    }
}