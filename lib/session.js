let crypto = require('crypto');

function random_string() {
  return crypto.randomBytes(20).toString('hex');
}

async function get_session_for_id(dataset, session_id) {
  let query = dataset.createQuery('Session').filter('session_id=',session_id);
  let entities = await dataset.runQueryAsync(query);
  return entities[0];
}

async function get_user_for_id(dataset, user_id) {
  let query = dataset.createQuery('User').filter('user_id=', user_id);
  let users = await dataset.runQueryAsync(query);
  return users[0];
}

function load_session(req, res, next) {
  let dataset = req.dataset;
  let session_id = req.cookies.session_id;
  if(session_id) {
    get_session_for_id(dataset, session_id).then(session=>{
      req.session = session;
      next();
    });
  } else {
    let session_id = random_string();
    let key = dataset.key('Session');
    dataset.saveAsync({
      key: key,
      data: {
        session_id: session_id
      },
    }).then(()=>{
      res.cookie('session_id', session_id);
      req.session = {key: key, data: {session_id: session_id}};
      next();
    });
  }
}

function associate_user_id(req, user_id) {
  let session = req.session;
  let dataset = req.dataset;
  session.data.user_id = user_id;
  return req.dataset.saveAsync(session);
}

function load_user(req, res, next) {
  let dataset = req.dataset;
  if(req.session) {
    let user_id = req.session.data.user_id;
    if(user_id) {
      get_user_for_id(dataset, user_id)
        .then(user=>{
          req.user = user;
          next();
        })
        .catch(err=>console.log(err));
    } else {
      next();
    }
  } else {
    next();
  }
}

module.exports = {load_session, associate_user_id, load_user, get_user_for_id};
