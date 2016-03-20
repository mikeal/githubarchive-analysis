var request = require('request').defaults({headers:{'user-agent':'get-org-from-archive-v0.0.1'}})
var zlib = require('zlib')
var path = require('path')
var fs = require('fs')
var jsonstream = require('jsonstream2')
var once = require('once')
var _ = require('lodash')
var through2 = require('through2')

var base = 'http://data.githubarchive.org'
var noop = _ => {}

function mask(obj) {
  var ret = _.pick(obj, ['id'])
  ret.type = obj.type.replace('Event', '')
  ret.actor = obj.actor.login
  ret.repo = obj.repo.name
  ret.ts = obj.created_at
  
  if (ret.type === 'Watch') return ret
  if (ret.type === 'Fork') return ret
  if (ret.type === 'CommitComment') return ret
  if (ret.type === 'Release') return ret
  if (ret.type === 'Public') return ret
  
  if (ret.type === 'Gollum') {
    ret.pages = obj.payload.pages.map(p => p.page_name)
  } else if (ret.type === 'Member') {
    ret.member = obj.payload.member.login
  } else if (ret.type.slice(0, 'Issue'.length) === 'Issue' || ret.type === 'PullRequest') {
    ret.number = obj.payload.issue ? obj.payload.issue.number : obj.payload.number
    ret.action = obj.payload.action
  } else if (ret.type === 'PullRequestReviewComment') {
    ret.number = obj.payload.pull_request.number
  } else if (ret.type === 'Push') {
    ret.commits = obj.payload.commits.map(c => ({sha: c.sha, email: c.author.email}))
    if (obj.payload.ref.slice(0, 'refs/heads/'.length) !== 'refs/heads/') throw new Error(obj.payload.ref)
    ret.branch = obj.payload.ref.slice('refs/heads/'.length)
  } else if (ret.type === 'Create') {
    ret.create = {ref: obj.payload.ref, ref_type:obj.payload.ref_type, branch: obj.payload.master_branch}
  } else if (ret.type === 'Delete') {
    ret.delete = _.pick(obj.payload, ['ref', 'ref_type'])
  } else {
    console.log(obj)
  }
  
  return ret
}

function getDay (day, cb) {
  var i = 0
  function getHour () {
    if (i === 24) return cb(null)
    var u = `${base}/${day}-${i}.json.gz`
    console.log('GET', u)
    var gunzip = zlib.createGunzip()
    gunzip.on('error', function (err) {
      console.error('ERROR in gzip', u)
      r.emit('end')
    })
    
    var writer = zlib.createGzip()
    writer.pipe(fs.createWriteStream(path.join(__dirname, 'archive', `${day}-${i}.min.json.gz`)))
    
    var r = request(u).pipe(gunzip).pipe(jsonstream.parse())
    r.on('end', once(function () {
      i++
      getHour()
    }))
    r.pipe(through2.obj((obj, enc, cb) => { cb(null, JSON.stringify(mask(obj))+'\n')})).pipe(writer)
  }
  getHour()
}

var ts = new Date('2016-01-01T00:00:00Z')
var oneday = 1000 * 60 * 60 * 24

function _go () {
  ts = new Date(ts.getTime() + oneday)
  if (ts > new Date()) return console.log('done')
  getDay(ts.toISOString().slice(0, '2015-09-01'.length), (err, count) => {
    _go()
  })
}

ts = new Date(ts.getTime() - oneday)

_go()
