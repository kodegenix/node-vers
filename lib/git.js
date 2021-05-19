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
        const verRe = /^[\-_.]v([0-9]+\.[0-9]+\.[0-9]+)$/
        let tags = [];
        for (let r of rows) {
            const t = r.split(':|:')
            // we skip non-annotated tags, as those will not be pushed to the origin
            if (!t[2]) {
                continue
            }
            const v = verRe.exec(t[0].substr(tagPrefix.length))
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
    gitFindCommitsForPaths: async function (startCommit, endCommit, paths) {
        const res = await cmdExec(`git log ${startCommit && endCommit ? startCommit + '..' + endCommit : ''} --format='%H' --first-parent -- ${paths.join(' ')}`)
        return res.out.trim().split('\n')
    },
    gitGetVersion: async function (pkgVersion, tagPrefix, preReleaseTag, paths) {
        const tags = await this.gitFindTags(tagPrefix)
        let commits
        let v
        if (tags.length) {
            // There are previous tags, so the version will be calculated from the last tag and commits since it
            const tag = tags[0]
            const head = await this.gitFindHead(false)
            commits = await this.gitFindCommitsForPaths(tag.commit, head, paths)
            v = tag.version
        } else {
            // There are no previous tags, so the version will be calculated from the manifest and all commits since
            commits = await this.gitFindCommitsForPaths(null, null, paths)
            v = pkgVersion
        }
        let ver
        if (commits.length <= 1) {
            ver = `${v}`
        } else {
            preReleaseTag = preReleaseTag ? preReleaseTag + '.' : ''
            ver = `${v}-${preReleaseTag}${commits.length - 1}+g${commits[0].substr(0, 7)}`
        }
        return semver.parse(ver, semverOpts)
    }
}