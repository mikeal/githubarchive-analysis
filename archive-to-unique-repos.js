var zlib = require('zlib')
var path = require('path')
var fs = require('fs')
var jsonstream = require('jsonstream2')
var through2 = require('through2')

var repos = new Set()

fs.createReadStream(path.join(__dirname, '2016-01.min.json.gz'))
.pipe(zlib.createGunzip())
.pipe(jsonstream.parse())
.pipe(through2.obj((obj, enc, cb) => {
   if (repos.has(obj.repo)) return cb(null)
   repos.add(obj.repo)
   cb(null, obj.repo+'\n')
}))
.pipe(process.stdout)