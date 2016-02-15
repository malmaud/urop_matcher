let crypto = require('crypto');
let Promise = require('bluebird');
let appengine = require('appengine');
let memcache = Promise.promisifyAll(appengine.memcache);
let r = require('rethinkdb');

function random_string() {
  return crypto.randomBytes(20).toString('hex');
}

async function get_session_for_id(req, session_id) {
  let conn = req.conn;
  let query = r.table('Session').filter(r.row('session_id').eq(session_id));
  let cursor = await query.run(conn);
  let session = await cursor.next();
  return session;
}

async function get_user_for_id(req, user_id) {
  let conn = req.conn;
  let query = r.table('User').filter(r.row('user_id').eq(user_id));
  let users = await query.run(conn);
  let user = await users.next();
  return user;
}

async function make_new_session(req, res) {
  let conn = req.conn;
  let session_id = random_string();
  let query = r.table('Session').insert({session_id: session_id});
  let result = await query.run(conn);
  res.cookie('session_id', session_id);
  req.session = {session_id: session_id, id: result.generated_keys[0]};
}

function load_session(req, res, next) {
  let conn = req.conn;
  let session_id = req.cookies.session_id;
  let needs_session = true;
  if(session_id) {
    get_session_for_id(req, session_id).then(session=>{
      req.session = session;
      needs_session = false;
      next();
    }).catch(err=>{
      console.log(`Problem retrieving session: ${err}`);
      make_new_session(req,res).then(next);
    });
  } else {
    make_new_session(req, res).then(next);
  }
}

function associate_user_id(req, user_id) {
  let session = req.session;
  let conn = req.conn;
  session.user_id = user_id;
  let query = r.table('Session').filter({id: session.id}).update({user_id: user_id});
  return query.run(conn);
}

function load_user(req, res, next) {
  if(req.session) {
    let user_id = req.session.user_id;
    if(user_id) {
      get_user_for_id(req, user_id)
        .then(user=>{
          req.user = user;
          next();
        })
        .catch(err=>{
          console.log(err);
          next();
        });
    } else {
      next();
    }
  } else {
    next();
  }
}

module.exports = {load_session, associate_user_id, load_user, get_user_for_id};
