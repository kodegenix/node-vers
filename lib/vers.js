const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function cmdExec(cmd, cwd, outputFn) {
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
    manifestBackup: async function (cwd) {
        await fs.copy(path.join(cwd, 'package.json'), path.join(cwd, '._vers.package.json'), {
            overwrite: true,
            preserveTimestamps: true,
            errorOnExist: false,
        });
    },
    manifestRestore: async function (cwd) {
        await fs.move(path.join(cwd, '._vers.package.json'), path.join(cwd, 'package.json'), {
            overwrite: true,
        });
    },
    manifestReplaceVersion: async function (cwd, ver) {
        const manifestFileName = path.join(cwd, 'package.json');
        let content = await fs.readFile(manifestFileName, 'utf8');
        content = content.replace(/("version"\s*:\s*").*?"/g, `$1${ver}"`);
        await fs.writeFile(manifestFileName, content);
    },
    npmPublish: async function (cwd, ver, opts) {
        await this.manifestBackup(cwd);
        try {
            await this.manifestReplaceVersion(cwd, ver);
            let cmd = 'npm publish --color=always';
            if (opts.tag) {
                cmd += ` --tag=${opts.tag}`;
            }
            if (opts.access) {
                cmd += ` --access=${opts.access}`;
            }
            if (opts.otp) {
                cmd += ` --otp=${opts.otp}`;
            }
            if (opts.dryRun) {
                cmd += ` --dry-run`;
            }
            await cmdExec(cmd, cwd, (out, err) => {
                console.error(err);
                console.log(out);
            });
        }
        catch (err) {
            throw err;
        }
        finally {
            await this.manifestRestore(cwd);
        }
    }

}
