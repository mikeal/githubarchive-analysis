var token = process.env.GHTOKEN
var request = require('request').defaults({headers:
  { 'user-agent': 'get-org-from-archive-v0.0.1',
    'authorization': `token ${token}`
  }, 'json': true
 })
var zlib = require('zlib')
var path = require('path')
var fs = require('fs')
var jsonstream = require('jsonstream2')
var once = require('once')
var _ = require('lodash')
var through2 = require('through2')
var levelup = require('levelup')
var sublevel = require('level-sublevel')
var base = 'https://api.github.com'

var db = sublevel(levelup(path.join(__dirname, 'repodb'), {valueEncoding: 'json'}))

var repos = fs.readFileSync(path.join(__dirname, 'unique.output')).toString().split('\n')

function write (id, data, cb) {
  db.put(id, data, (err) => cb(err, data))
}

var keys = 
 ['fork', 
  'created_at', 
  'language',
  'forks',
  'packagejson'
  ]

function mask (data) {
  var ret = _.pick(data, keys)
  ret.gid = data.id
  if (data.organization) ret.org = true
  if (data.source) ret.fork = data.source.full_name
  return ret
}

function getRepo (name, cb) {
  db.get(name, (err, info) => {
    if (!err) return cb(null, info)
    var u = `${base}/repos/${name}`
    request(u, (err, resp, data) => {
      if (err) return cb(err)
      if (resp.statusCode === 401) throw new Error('rate limit', u)
      if (resp.statusCode !== 200) {
        return write(name, {error: resp.statusCode}, cb)
      }
      u = `https://raw.githubusercontent.com/${name}/${data.default_branch}/package.json`
      request.head(u, function (e, resp) {
        if (resp.statusCode === 401) throw new Error('rate limit', u)
        data.packagejson = resp.statusCode === 200
        if (resp.statusCode !== 404 && resp.statusCode !== 200) console.log('github raw error', resp.statusCode)
        write(name, mask(data), cb)
      })
    })
  })
}

function _run () {
  if (!repos.length) return
  getRepo(repos.shift(), (err, info) => {
    bar.tick()
    _run()
  })
}
_run()
_run()
_run()

var ProgressBar = require('progress');

var bar = new ProgressBar('pulling :current/:total [:bar] :percent :elapsed/:eta', { total: repos.length });
