var fs = require('fs')
var zlib = require('zlib')
var path = require('path')
var through2 = require('through2')
var jsonstream2 = require('jsonstream2')
var levelup = require('levelup')

var db = levelup(path.join(__dirname, 'repodb'), {valueEncoding: 'json'})

var reader = fs.createReadStream(path.join(__dirname, '2016-01.min.json.gz'))
.pipe(zlib.createGunzip())
.pipe(jsonstream2.parse())
.pipe(through2.obj((obj, enc, cb) => {
  db.get(obj.repo, (e, info) => {
    obj.rinfo = info || null
    cb(null, JSON.stringify(obj)+'\n')
  })
}))
.pipe(zlib.createGzip())
.pipe(fs.createWriteStream(path.join(__dirname, '2016-01.min.repo.json.gz')))

