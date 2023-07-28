const { cmdExec, version, VersError } = require('./commons')

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
        const res = await cmdExec(`git --no-pager tag --list --format="%(refname:short):|:%(objectname):|:%(object)" "${tagPrefix}*"`)
        const rows = res.out.trim().split('\n')
        const verRe = /^[\-_.]v?([0-9]+\.[0-9]+\.[0-9]+.*)$/
        let tags = [];
        for (let r of rows) {
            const t = r.split(':|:')
            // we skip non-annotated tags, as those will not be pushed to the origin
            if (!t[2]) {
                continue
            }
            const vstr = t[0].substring(tagPrefix.length)
            const v = verRe.exec(vstr)
            if (v && v[1]) {
                const tag = {
                    tag: t[0],
                    version: version.parse(v[1]),
                    commit: t[2],
                }
                tags.push(tag)
            }
        }
        tags.sort((a, b) => version.compare(a.version, b.version, true))
        return tags
    },
    gitFindCommitsForPaths: async function (startCommit, endCommit, paths) {
        const res = await cmdExec(`git log ${startCommit && endCommit ? startCommit + '..' + endCommit : ''} --format=%H --first-parent -- ${paths.join(' ')}`)
        const out = res.out
        return out ? out.trim().split('\n') : []
    },
    gitGetVersion: async function (fallbackVer, tagPrefix, gitHash, pre, build, paths) {
        const head = await this.gitFindHead(false)
        const tags = await this.gitFindTags(tagPrefix)
        let commits
        let v
        if (tags.length) {
            // There are previous tags, so the version will be calculated from the last tag and commits since it
            const tag = tags[0]
            commits = await this.gitFindCommitsForPaths(tag.commit, head, paths)
            v = tag.version
        } else {
            // There are no previous tags, so the version will be calculated from the manifest and all commits since
            commits = await this.gitFindCommitsForPaths(null, null, paths)
            v = fallbackVer
        }

        if (pre && pre.length) {
            v.prerelease.push(...pre)
        }
        if (build && build.length) {
            v.build.push(...build)
        }
        if (gitHash) {
            if (commits.length) {
                v.prerelease.push(commits.length.toString())
                v.build.push(`g${commits[0].substring(0, 7)}`)
            } else {
                v.build.push(`g${head.substring(0, 7)}`)
            }
        }
        return v
    }
}