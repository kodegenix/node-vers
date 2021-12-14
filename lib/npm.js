const fs = require('fs-extra')
const path = require('path')
const { cmdExec, VersError } = require('./commons')

module.exports = {
    manifestRead: async function (manifestPath) {
        const manifestFileName = path.resolve(manifestPath || './package.json')
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
    manifestReplace: async function (ver, name) {
        const manifestFileName = 'package.json'
        let content = await fs.readFile(manifestFileName, 'utf8')
        content = content.replace(/("version"\s*:\s*").*?"/g, `$1${ver}"`)
        if (name) {
            content = content.replace(/("name"\s*:\s*").*?"/g, `$1${name}"`)
        }
        await fs.writeFile(manifestFileName, content)
    },
    npmGetPublishedPackageInfo: async function (pkg, ver) {
        try {
            const res = await cmdExec(`npm view ${pkg}@${ver} --silent --json`)
            return res.out ? JSON.parse(res.out) : null
        }
        catch (err) {
            if (err instanceof VersError) {
                const errInfo = JSON.parse(err.output.out || err.output.err)
                if (errInfo.error.code === 'E404') {
                    return null
                }
            }
            throw err
        }
    },
    npmGetPackageInfo: async function (dir) {
        const res = await cmdExec(`npm publish ${dir} --json --dry-run`)
        return JSON.parse(res.out)
    },
    npmPublish: async function (ver, options) {
        await this.manifestBackup()
        try {
            await this.manifestReplace(ver, options.name)
            if (options.check) {
                let info1, info2
                info1 = await this.npmGetPackageInfo(process.cwd());
                info2 = await this.npmGetPublishedPackageInfo(info1.name, ver)
                if (info2) {
                    if (info1.integrity && info2.integrity && info1.integrity !== info2.integrity) {
                        throw new VersError(`package '${info1.name}@${ver}' already exists in repository, but integrity does not match.`)
                    }
                    if (info1.shasum && info2.shasum && info1.shasum !== info2.shasum) {
                        throw new VersError(`package '${info1.name}@${ver}' already exists in repository, but shasum does not match.`)
                    }
                    console.log(`package '${info1.name}@${ver}' already exists in repository, nothing to do`)
                    return
                }
            }
            let cmd = 'npm publish --color=always'
            if (options.tag) {
                cmd += ` --tag=${options.tag}`
            }
            if (options.access) {
                cmd += ` --access=${options.access}`
            }
            if (options.otp) {
                cmd += ` --otp=${options.otp}`
            }
            if (options.dryRun) {
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
