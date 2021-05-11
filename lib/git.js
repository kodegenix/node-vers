const semver = require('semver')
const { cmdExec, VersError } = require('./commons')

const semverOpts = {
    loose: false,
    includePrerelease: true,
    rtl: false,
}

module.exports = {
    gitFindRoot: async function () {
        const res = await cmdExec(`git rev-parse --show-toplevel`)
        return res.out.trim()
    },
    gitFindHead: async function (short) {
        const res = await cmdExec(`git rev-parse HEAD ${short ? '--short' : ''}`)
        return res.out.trim()
    },
    gitFindTags: async function (tagPrefix) {
        const res = await cmdExec(`git --no-pager tag --list --format='%(refname:short):|:%(objectname):|:%(object)' '${tagPrefix}*'`)
        const rows = res.out.trim().split('\n')
        const verRe = /^(?:[A-Za-z0-9_\-.]+?[\-_.])?v([0-9]+\.[0-9]+\.[0-9]+)$/
        let tags = [];
        for (let r of rows) {
            const t = r.split(':|:')
            // we skip non-annotated tags, as those will not be pushed to the origin
            if (!t[2]) {
                continue
            }
            const v = verRe.exec(t[0])
            if (v && v[1] && semver.valid(semver.coerce(v[1], semverOpts))) {
                const tag = {
                    tag: t[0],
                    version: semver.coerce(v[1], semverOpts),
                    commit: t[2],
                }
                tags.push(tag)
            }
        }
        tags.sort((a, b) => semver.rcompare(a.version, b.version))
        return tags
    },
    gitCountCommits: async function (startCommit, endCommit, dirPath) {
        const res = await cmdExec(`git log ${startCommit}..${endCommit || ''} --format='%H' -- ${dirPath}`)
        return res.out.trim().split('\n').length
    },
    gitGetVersion: async function (tagPrefix, preReleaseTag) {
        const head = await this.gitFindHead(false)
        const tags = await this.gitFindTags(tagPrefix)
        if (tags.length) {
            const tag = tags[0]
            const count = await this.gitCountCommits(tag.commit, head, process.cwd())
            let ver
            if (count === 1) {
                ver = `${tag.version}`
            } else {
                preReleaseTag = preReleaseTag ? preReleaseTag + '.' : ''
                ver =`${tag.version}-${preReleaseTag}${count - 1}+g${head.substr(0, 7)}`
            }
            return semver.parse(ver, semverOpts)
        } else {
            throw new VersError(`Could not find any annotated version tags with prefix: '${tagPrefix}'`)
        }
    }
}