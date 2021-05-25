const fs = require('fs-extra')
const { cmdExec, version, VersError } = require('./commons')

module.exports = {
    manifestRead: async function () {
        try {
            let res = await cmdExec("cargo metadata --format-version=1 --no-deps")
            return JSON.parse(res.out)
        }
        catch (err) {
            console.error(err)
        }
    },
}