var fs = require('fs')
var zlib = require('zlib')
var path = require('path')
var through2 = require('through2')
var jsonstream2 = require('jsonstream2')

var reader = fs.createReadStream(path.join(__dirname, 'db.json.gz'))
.pipe(zlib.createGunzip())
.pipe(jsonstream2.parse())

var levelup = require('levelup')
var sublevel = require('level-sublevel')

var db = levelup(path.join(__dirname, 'repodb'), {valueEncoding: 'json'})

reader.pipe(through2.obj((obj, enc, cb) => {
  db.put(obj.key, obj.value, cb)
}))

// db.createReadStream().on('data', function (obj) {
//   writer.write(JSON.stringify(obj)+'\n')
// })