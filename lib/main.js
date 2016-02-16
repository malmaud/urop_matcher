let Promise = require('bluebird');
let express = require('express');
let React = require('react');
let ReactDOMServer = require('react-dom/server');
let gcloud = require('gcloud')({
  projectId: 'urop-1210',
  keyFilename: '/secrets/keyfile.json'
});
let querystring = require('querystring');
let request = Promise.promisifyAll(require('request'));
let cookieParser = require('cookie-parser');
let jwt = require('jsonwebtoken');
let fs = Promise.promisifyAll(require('fs'));
let session = require('./session');
let jade = require('jade');
let bodyParser = require('body-parser');
let Content = require('./views/content');
let multer = require('multer');
let upload = multer();
let gcs = gcloud.storage();
let appengine = require('appengine');
let r = require('rethinkdb');
let $ = require('jquery');

async function open_db() {
  let c = await r.connect({host: 'db', port: 28015, db: 'urop'});
  return c;
}

let conn;
let app = express();

open_db().then(c=>{conn=c});

app.use(appengine.middleware.base);

app.use(cookieParser())

app.use((req,res,next)=>{
  req.conn = conn;
  next();
});

app.use(session.load_session);

app.use(session.load_user);

app.use((req, res, next)=>{
  let pageData = {logged_in: false, is_user: false, user: null};
  if(req.session.user_id) {  // Has a Google ID
    pageData.logged_in = true;
  }
  if(req.user) {
    pageData.is_user = true;
    pageData.user = req.user;
  }
  req.pageData = pageData;
  next();
});

app.use(bodyParser.json());

// app.disable('etag');

function buildReact(req, page, props) {
  props = props || {};
  req.pageData.props = props;
  props.page = page;
  props.user = req.user;
  let control = React.createElement(Content, props);
  req.pageData.react = ReactDOMServer.renderToString(control);
  return req;
}

app.get('/', async (req, res)=> {
  let props = {};
  if(req.user && req.user.host_id && req.user.host_id.length > 0) {
    props.host = await r.table('User').get(req.user.host_id).run(req.conn);
  }
  if(req.user) {
    let cursor = await r.table('User').filter(r.row('host_id').eq(req.user.id)).run(req.conn);
    let urops = await cursor.toArray();
    props.urops = urops;
  }
  buildReact(req, 'home', props);
  let html = jade.renderFile('templates/base.jade', {pageData: req.pageData});
  res.send(html);
});

app.get('/feedback', (req, res)=>{
  buildReact(req, 'feedback');
  let html = jade.renderFile('templates/base.jade', {pageData: req.pageData});
  res.send(html);
});

app.get('/host_register', (req, res)=>{
  buildReact(req, 'host_register');
  let html = jade.renderFile('templates/base.jade', {pageData: req.pageData});
  res.send(html);
});

app.get('/urop_register', (req, res)=>{
  buildReact(req, 'urop_register');
  let html = jade.renderFile('templates/base.jade', {pageData: req.pageData});
  res.send(html);
});

app.get('/browse', async (req, res)=>{
  let cursor = await r.table('User').run(req.conn);
  let users = await cursor.toArray();
  buildReact(req, 'browse', {users});
  let html = jade.renderFile('templates/base.jade', {pageData: req.pageData});
  res.send(html);
});

let client_info;

fs.readFileAsync('/secrets/secret.json', 'utf8').then(data=>{
  client_info = JSON.parse(data);
});

app.get('/login', (req, res)=>{
  let query = querystring.stringify({
    client_id: client_info.client_id,
    response_type: 'code',
    scope: 'openid email',
    redirect_uri: 'http://localhost:8080/google_redirect',
    state: '1'});
  let base = 'https://accounts.google.com/o/oauth2/v2/auth?';
  res.redirect(base+query);
});

app.get('/logout', (req, res)=>{
  res.clearCookie('session_id');
  res.redirect('/');
});

app.get('/google_redirect', (req, res)=>{
  let data = {
    code: req.query.code,
    client_id: client_info.client_id,
    client_secret: client_info.client_secret,
    redirect_uri: 'http://localhost:8080/google_redirect',
    grant_type: 'authorization_code'
  };
  request.postAsync({
    uri: 'https://www.googleapis.com/oauth2/v4/token',
    form: data
  }).then(response=>{
    console.log(response);
    let body = response.body;
    let payload = JSON.parse(body);
    let token = jwt.decode(payload.id_token);
    let user_id = token.sub;
    session.associate_user_id(req, user_id)
      .catch(err=>console.log(err))
      .then(()=>res.redirect('/'));
  });

});

app.use('/static', express.static('static'));

app.route('/api/host')
  .post(async (req, res)=>{
    let payload = req.body;
    console.log(payload);
    let data = {name: payload.name, email: payload.email, research: payload.research, user_id: req.session.user_id, kind: 'Host'};
    console.log(data);
    await r.table('User').insert(data).run(req.conn);
    res.send({status: 'ok'});
  });

app.get('/api/host/:user_id', async (req, res)=>{
  let user_id = req.params.user_id;
  let user = await session.get_user_for_id(req.dataset, user_id);
  res.send(user);
});

app.route('/api/user/:user_id')
  .put(async (req, res)=>{
    let new_user = {};
    for(let field of ['name', 'email', 'statement', 'research', 'host_id', 'approved']) {
      if(req.body[field]) new_user[field] = req.body[field];
    }
    await r.table('User').get(req.params.user_id).update(new_user).run(req.conn);
    console.log(req.body['host_id']);
    if(req.body['host_id']=='') {
      console.log('deleting host_id');
      await r.table('User').get(req.params.user_id).replace(r.row.without('host_id')).run(req.conn);
    }
    res.send({status: 'ok'});
  });


app.route('/api/feedback')
  .post(async (req,res)=>{
    console.log('posting feedback');
    console.log(req.body);
    let data = {feedback: req.body.feedback, user_id: req.body.user_id};
    await r.table('Feedback').insert(data).run(req.conn);
    res.send({status: 'ok'});
  });

async function save_cv(req, user_id, cv) {
  let filename = `${user_id}/${cv.originalname}`;
  let save_cv = r.table('User').get(user_id).update({cv: filename}).run(req.conn);
  let bucket = gcs.bucket('urop_uploads');
  let file = bucket.file(filename).createWriteStream();
  file.write(cv.buffer);
  file.end();
  await save_cv;
  return {file, filename};
}

app.route('/api/urop')
  .post(upload.single('cv'), async (req, res)=>{
    let cv = req.file;
    let entity = {
      name: req.body.name,
      email: req.body.email,
      statement: req.body.statement,
      user_id: req.session.user_id,
      kind: 'UROP'
    };
    let bucket = gcs.bucket('urop_uploads');
    let new_user = await r.table('User').insert(entity).run(req.conn);
    let id = new_user.generated_keys[0];
    if(cv) {
      let {file} = await save_cv(req, id, cv);
      file.on('finish', ()=>{
          res.send({status: 'ok'});
      });
    } else {
      res.send({status: 'ok'});
    }

  });

app.route('/api/user/:user_id/cv')
  .get(async (req,res)=>{
    let user = await r.table('User').get(req.params.user_id).run(req.conn);
    console.log(user);
    let filename = user.cv;
    let file = Promise.promisifyAll(gcs.bucket('urop_uploads').file(filename));
    let stream = file.createReadStream();
    let chunks = [];
    stream.on('data', chunk=>{
      chunks.push(chunk);
    });
    stream.on('end', async ()=>{
      let body = Buffer.concat(chunks);
      let metadata = await file.getMetadataAsync();
      console.log(metadata);
      res.setHeader('content-type', metadata.contentType);
      res.send(body);
    });
  })
  .delete(async (req,res)=>{
    await r.table('User').get(req.params.user_id).update({cv: ''});
    res.send({status: 'ok'});
  })
  .put(upload.single('cv'), async (req,res)=>{
    let cv = req.file;
    let {file, filename} = await save_cv(req, req.params.user_id, cv);
    file.on('finish', ()=>res.send({status: 'ok', cv_filename: filename}));
  });

async function init_db() {
    let conn = await open_db();
    let actions = [];
    let tables = await r.tableList().run(conn);
    console.log(tables);
    let maybe_make_table = name=>{
      if(tables.indexOf(name) < 0) {
        let make_table = r.tableCreate(name).run(conn);
        actions.push(make_table);
      }
    };
    for(let name of ['User', 'Session', 'Feedback']) {
      maybe_make_table(name);
    }
    let res = await Promise.all(actions);
    return res;
}

app.get('/_util/mock_login', async (req, res)=>{
  buildReact(req, 'mock_login');
  let html = jade.renderFile('templates/base.jade', {pageData: req.pageData});
  res.send(html);
});

app.post('/_util/mock_login', async (req, res)=>{
  let email = req.body.email;
  await session.associate_user_id(req, email);
  res.send({status: 'ok'});
});

app.get('/_util/mock_logout', async (req, res)=>{
  res.clearCookie('session_id');
  res.redirect('/');
});

module.exports = {
  run() {
    app.listen(8080);
  },

  sync_init_db() {
    let p = init_db();
    p.then(res=>console.log(`Got result ${res}`)).catch(err=>console.log(`got error ${err}`));

  }
}
