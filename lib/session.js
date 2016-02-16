let crypto = require('crypto');
let Promise = require('bluebird');
let appengine = require('appengine');
let memcache = Promise.promisifyAll(appengine.memcache);
let r = require('rethinkdb');

function random_string() {
  return crypto.randomBytes(20).toString('hex');
}

function session_key(session_id) {
  return `session:${session_id}`;
}

function user_key(user_id) {
  return `user:${user_id}`;
}

async function get_session_for_id(req, session_id) {
  let session;
  session = await req.redisClient.getAsync(session_key(session_id));
  if(session) {
    session = JSON.parse(session);
  }
  else {
    let conn = req.conn;
    let query = r.table('Session').filter(r.row('session_id').eq(session_id));
    let cursor = await query.run(conn);
    session = await cursor.next();
    await req.redisClient.setAsync(session_key(session_id), JSON.stringify(session));
  }
  return session;
}

async function get_user_for_id(req, user_id) {
  // let user = await req.redisClient.getAsync(user_key(user_id));
  let user = null;
  if(user) {
    user = JSON.parse(user);
  } else {
    let conn = req.conn;
    let query = r.table('User').filter(r.row('user_id').eq(user_id));
    let cursor = await query.run(conn);
    let users = await cursor.toArray();
    if(users.length==0) {
      return null;
    }
    user = users[0];
    // await req.redisClient.setAsync(user_key(user_id), JSON.stringify(user));
  }
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

async function associate_user_id(req, user_id) {
  let session = req.session;
  let conn = req.conn;
  session.user_id = user_id;
  let query = r.table('Session').filter({id: session.id}).update({user_id: user_id});
  let res = await req.redisClient.delAsync(session_key(session.session_id));
  console.log(`redis delete: ${res}`);
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
