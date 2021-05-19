const fs = require('fs-extra')
const { cmdExec } = require('./commons')

module.exports = {
    manifestRead: async function () {
        const manifestFileName = 'package.json'
        return await fs.readJson(manifestFileName, 'utf8')
    },
    manifestBackup: async function () {
        await fs.copy('package.json', '._vers.package.json', {
            overwrite: true,
            preserveTimestamps: true,
            errorOnExist: false,
        })
    },
    manifestRestore: async function () {
        await fs.move('._vers.package.json', 'package.json', {
            overwrite: true,
        })
    },
    manifestReplaceVersion: async function (ver) {
        const manifestFileName = 'package.json'
        let content = await fs.readFile(manifestFileName, 'utf8')
        content = content.replace(/("version"\s*:\s*").*?"/g, `$1${ver}"`)
        await fs.writeFile(manifestFileName, content)
    },
    npmView: async function (pkg, ver) {
        await cmdExec(`npm view ${pkg}@${ver} version`)
    },
    npmPublish: async function (ver, opts) {
        await this.manifestBackup()
        try {
            await this.manifestReplaceVersion(ver)
            let cmd = 'npm publish --color=always'
            if (opts.tag) {
                cmd += ` --tag=${opts.tag}`
            }
            if (opts.access) {
                cmd += ` --access=${opts.access}`
            }
            if (opts.otp) {
                cmd += ` --otp=${opts.otp}`
            }
            if (opts.dryRun) {
                cmd += ` --dry-run`
            }
            const res = await cmdExec(cmd)
            console.error(res.err)
            console.log(res.out)
        }
        catch (err) {
            throw err
        }
        finally {
            await this.manifestRestore()
        }
    }
}
