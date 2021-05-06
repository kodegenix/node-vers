const { cmdExec } = require('./cmd')
const semver = require('semver')

module.exports = {
    gitFindRoot: async function () {
        const res = await cmdExec(`git rev-parse --show-toplevel`)
        return res.out.trim()
    },
    gitFindTags: async function (tagPrefix) {
        const res = await cmdExec(`git --no-pager tag --list --format='%(refname:short):|:%(objectname):|:%(object)' '${tagPrefix}*'`)
        const rows = res.out.trim().split('\n')
        const ver_re = /[\\-_\\.]?v?([0-9a-z\\-_\\.]+)/
        let tags = [];
        const semverOpts = {
            loose: false,
            includePrerelease: true,
            rtl: false,
        }
        for (let r of rows) {
            const t = r.split(':|:')
            const v = ver_re.exec(t[0].substr(tagPrefix.length))
            tags.push({
                tag: t[0],
                version: v && v[1] ? semver.parse(v[1], semverOpts) : null,
                commit: t[2],
            })
        }
        tags.sort((a, b) => semver.rcompare(a.version, b.version))
        return tags
    },
    gitCountCommits: async function (startCommit, endCommit, dirPath) {
        const res = await cmdExec(`git log ${startCommit}..${endCommit || ''} --format='%H' -- ${dirPath}`)
        return res.out.trim().split('\n').length
    },
    gitGetVersion: async function (tagPrefix) {
        const tags = await this.gitFindTags(tagPrefix)
        const tag = tags[0]
        const count = await this.gitCountCommits(tag.commit, null, process.cwd())
        if (count === 1) {
            return `${tag.version}`
        } else {
            return `${tag.version}-dev-${count - 1}-g${tag.commit.substr(0, 7)}`
        }
    }
}