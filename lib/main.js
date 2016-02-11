let Promise = require('bluebird');
let express = require('express');
let React = require('react');
let ReactDOMServer = require('react-dom/server');
let gcloud = require('gcloud')({
  projectId: 'urop-1210',
  keyFilename: 'keyfile.json'
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

let dataset = Promise.promisifyAll(gcloud.datastore.dataset());

let app = express();

app.use(cookieParser())

app.use((req,res,next)=>{
  req.dataset = dataset;
  next();
});

app.use(session.load_session);

app.use(session.load_user);

app.use((req, res, next)=>{
  let pageData = {logged_in: false, is_user: false, user: null};
  if(req.session.data.user_id) {  // Has a Google ID
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

app.disable('etag');

function buildReact(req, page, props) {
  props = props || {};
  req.pageData.props = props;
  props.page = page;
  props.user = req.user;
  let control = React.createElement(Content, props);
  req.pageData.react = ReactDOMServer.renderToString(control);
  return req;
}

app.get('/', (req, res)=> {
  buildReact(req, 'home');
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

app.get('/browse', (req, res)=>{
  let query = dataset.createQuery('User');
  dataset.runQueryAsync(query).then(users=>{
    console.log(users);
    buildReact(req, 'browse', {users});
    let html = jade.renderFile('templates/base.jade', {pageData: req.pageData});
    res.send(html);
  });
});

let client_info;

fs.readFileAsync('secret.json', 'utf8').then(data=>{
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
  .post((req, res)=>{
    let payload = req.body;
    console.log(payload);
    let data = {name: payload.name, email: payload.email, research: payload.research, user_id: req.session.data.user_id, kind: 'Host'};
    console.log(data);
    let entity = {key: dataset.key('User'), data: data};
    dataset.saveAsync(entity).then(()=>{
      res.send({status: 'ok'});
    });
  });

app.get('/api/host/:user_id', (req, res)=>{
  let user_id = req.params.user_id;
  session.get_user_for_id(req.dataset, user_id).then(user=>{
    res.send(user);
  });
});

app.route('/api/user/:user_id')
  .put((req, res)=>{
    session.get_user_for_id(req.dataset, req.params.user_id).then(user=>{
      let data = user.data;
      data.name = res.data.name;
      data.email = res.data.email;
      data.statement = res.data.statement;
      data.research = res.data.research;
      return dataset.saveAsync(user);
    }).then(()=>{
      res.send({status: 'ok'});
    });
  });


app.route('/api/feedback')
  .post((req,res)=>{
    console.log('posting feedback');
    console.log(req.body);
    let data = {feedback: req.body.feedback, user_id: req.body.user_id};
    let entity = {key: dataset.key('Feedback'), data: data};
    dataset.saveAsync(entity)
      .then(()=>{
        res.send({status: 'ok'});
      })
      .catch(err=>console.log(err));
    console.log('saved ', entity);
  });

app.route('/api/urop')
  .post(upload.single('cv'), (req, res)=>{
    let cv = req.file;
    let entity = {key: dataset.key('User'), data: {
      name: req.body.name,
      email: req.body.email,
      statement: req.body.statement,
      user_id: req.session.data.user_id
    }};
    let bucket = gcs.bucket('urop_uploads');
    let filename;
    dataset.saveAsync(entity)
    .then(()=>{
      let id = entity.key.id;
      filename = `${id}/${cv.originalname}`;
      entity.data.cv = filename;
      return dataset.saveAsync(entity);
    })
    .then(()=>{
      let file = bucket.file(filename).createWriteStream();
      file.write(cv.buffer);
      file.end();
      file.on('finish', ()=>{
        res.send({status: 'ok'});
      });
    });
  });

app.route('/api/user/:user_id/cv')
  .get((req,res)=>{
    let key = dataset.key(['User', parseInt(req.params.user_id)]);
    dataset.getAsync(key).then(user=>{
      console.log(user);
      let filename = user.data.cv;
      let file = Promise.promisifyAll(gcs.bucket('urop_uploads').file(filename));
      let stream = file.createReadStream();
      let chunks = [];
      stream.on('data', chunk=>{
        chunks.push(chunk);
      });
      stream.on('end', ()=>{
        let body = Buffer.concat(chunks);
        file.getMetadataAsync().then(metadata=>{
          console.log(metadata);
          res.setHeader('content-type', metadata.contentType);
          res.send(body);
        });
      });
    });
  })
  .delete((req,res)=>{
    let key = dataset.key(['User', parseInt(req.params.user_id)]);
    dataset.getAsync(key).then(user=>{
      user.data.cv = '';
      return dataset.saveAsync(user);
    }).then(()=>{
      res.send({status: 'ok'});
    });
  });

module.exports = {
  run() {
    app.listen(8080);
  }
}
