import webapp2
import jinja2
import os
import logging
import json
from google.appengine.api import users
import datetime
import google
import cloudstorage as gcs
import cgi
import mimetypes

import model

mimetypes.init()

JINJA = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(
        os.path.dirname(__file__), 'templates')),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)


def to_json(obj):
    def json_serial(obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        if isinstance(obj, google.appengine.ext.ndb.key.Key):
            return obj.id()
        raise TypeError("")
    return json.dumps(obj, default=json_serial, encoding='utf8')


def user_to_dict(user):
    return user.to_dict()


class Hello(webapp2.RequestHandler):

    def get(self):
        t = JINJA.get_template('main.html')
        state = get_state()
        if state['user'] is not None:
            self.redirect('/dashboard')
        else:
            self.response.write(t.render(**state))


class UropSubmit(webapp2.RequestHandler):

    def get(self):
        t = JINJA.get_template('urop_submit.html')
        self.response.write(t.render(**get_state()))


def save_cv(user, cv):
    filename = '/urop_uploads/%s/%s' % (user.user_id, cv.filename)
    content_type = mimetypes.guess_type(filename)[0]
    gcs_file = gcs.open(filename, 'w', content_type=content_type)
    gcs_file.write(cv.file.read())
    gcs_file.close()
    return filename


class UROPCollection(webapp2.RequestHandler):

    def post(self):
        state = get_state()
        if state['user'] is not None:
            return
        logging.info("registering user")
        urop = model.User()
        cv = self.request.POST.get('cv')
        logging.info("filename is %s" % cv)
        urop.name = self.request.get('name')
        urop.email = self.request.get('email')
        urop.user_id = users.get_current_user().user_id()
        urop.statement = self.request.get('statement')
        urop.kind = 'UROP'
        urop.put()
        if (cv is not None) and hasattr(cv, 'filename'):
            urop.cv = save_cv(urop, cv)
            urop.put()
        json_reply(self)
        d = dict(status='ok')
        d['urop'] = user_to_dict(urop)
        self.response.write(to_json(d))
        entry = model.LogEntry()
        entry.patient = urop.key
        entry.action = 'UROP created'
        entry.put()


class HostSubmit(webapp2.RequestHandler):

    def get(self):
        t = JINJA.get_template('host_register.html')
        self.response.write(t.render(**get_state()))


class HostCollection(webapp2.RequestHandler):

    def post(self):
        state = get_state()
        if state['user'] is not None:
            return
        host = model.User()
        data = json.loads(self.request.body)
        host.name = data['name']
        host.email = data['email']
        host.research = data['research']
        host.user_id = users.get_current_user().user_id()
        host.approved = False
        host.kind = 'Host'
        host.put()
        json_reply(self)
        d = dict(status='ok')
        d['host'] = user_to_dict(host)
        self.response.write(to_json(d))
        entry = model.LogEntry()
        entry.patient = host.key
        entry.action = 'Host created'
        entry.put()


def get_state():
    google_user = users.get_current_user()
    json_user = None
    if google_user:
        user = model.User.for_user_id(google_user.user_id())
        if user:
            d = user_to_dict(user)
            d['key'] = user.key
            json_user = to_json(d)
    else:
        user = None
        json_user = ""
    return dict(google_user=google_user, user=user, login_url=users.create_login_url('/'), logout_url=users.create_logout_url('/'), json_user=json_user)


def has_permissions(profile):
    user = get_user()
    return True  # todo: fill in


class UserProfile(webapp2.RequestHandler):

    def get(self, user_id):
        t = JINJA.get_template('user_profile.html')
        self.response.write(t.render(user_id=user_id, **get_state()))


class Browse(webapp2.RequestHandler):

    def get(self):
        t = JINJA.get_template('browse.html')
        state = get_state()
        user = state['user']
        users = model.User.for_lab(user.lab).fetch(10000)
        json_users = to_json([user_to_dict(user) for user in users])
        logging.info(json_users)
        self.response.write(t.render(users=json_users, **state))


class HostUrops(webapp2.RequestHandler):

    def post(self, host_id, urop_id):
        json_reply(self)
        if host_id != "current":
            d = dict(status='not ok')
            self.response.write(to_json(d))
            return
        host = get_state()['user']
        if not host.approved:
            d = dict(status='host not approved')
            self.response.write(to_json(d))
            return
        urop = model.User.for_user_id(urop_id)
        urop.host = host.key
        urop.put()
        d = dict(status='ok')
        self.response.write(to_json(d))
        entry = model.LogEntry()
        entry.agent = host.key
        entry.patient = urop.key
        entry.action = 'UROP claimed'
        entry.put()

    def delete(self, host_id, urop_id):
        urop = model.User.for_user_id(urop_id)
        urop.host = None
        urop.put()
        entry = model.LogEntry()
        host = model.User.for_user_id(host_id)
        entry.agent = host.key
        entry.patient = urop.key
        entry.action = 'UROP disclaimed'
        entry.put()


class Dashboard(webapp2.RequestHandler):

    def get(self):
        t = JINJA.get_template('home.html')
        state = get_state()
        user = state['user']
        urops = None
        host = None
        logging.info(user.kind)
        if user.kind == 'Host':
            urops = user.get_urops().fetch(1000)
            urops = to_json([user_to_dict(urop) for urop in urops])
        elif user.kind == 'UROP':
            if user.host is not None:
                host = user.host.get()
                host = to_json(user_to_dict(host))
        logging.info(urops)
        self.response.write(t.render(host=host, urops=urops, **get_state()))


def json_reply(msg):
    msg.response.headers['Content-Type'] = 'application/json'
    return msg


class Hosts(webapp2.RequestHandler):

    def put(self, host_id):
        payload = json.loads(self.request.body)
        logging.info(payload)
        user = get_state()['user']
        host = model.User.for_user_id(host_id)
        d = dict()
        if (host is None) or (host.kind != 'Host'):
            d['status'] = 'invalid host'
        else:
            if user.kind == 'Host' and user.approved:
                d['status'] = 'ok'
                host.approved = True
                host.put()
                entry = model.LogEntry()
                entry.agent = user.key
                entry.patient = host.key
                entry.action = 'Host approved'
                entry.put()
            else:
                d['status'] = 'not permitted'
        json_reply(self)
        self.response.write(to_json(d))


class CV(webapp2.RequestHandler):

    def get(self, user_id):
        urop = model.User.for_user_id(user_id)
        # todo: check permissions
        filename = urop.cv
        gcs_file = gcs.open(filename)
        content = gcs_file.read()
        gcs_file.close()
        basename = urop.cv.split('/')[-1]
        metadata = gcs.stat(filename)
        # self.response.headers['Content-Disposition'] = ('attachment; filename=%s' % basename).encode()
        logging.info(metadata.content_type)
        self.response.headers['Content-Type'] = metadata.content_type
        self.response.write(content)

    def delete(self, user_id):
        user = model.User.for_user_id(user_id)
        user.cv = ""
        user.put()
        json_reply(self)
        d = dict(status='ok')
        self.response.write(to_json(d))

    def put(self, user_id):
        user = model.User.for_user_id(user_id)
        cv = self.request.POST.get('cv')
        user.cv = save_cv(user, cv)
        user.put()
        json_reply(self)
        d = dict(status='ok')
        d['cv_filename'] = user.cv
        self.response.write(to_json(d))


class UserHandler(webapp2.RequestHandler):

    def put(self, user_id):
        user = get_state()['user']
        d = {}
        payload = json.loads(self.request.body)
        if user.user_id == user_id:
            d['status'] = 'ok'
            if 'name' in payload:
                user.name = payload['name']
            if 'email' in payload:
                user.email = payload['email']
            if 'research' in payload:
                user.research = payload['research']
            if 'statement' in payload:
                user.statement = payload['statement']
            user.put()
            entry = model.LogEntry()
            entry.agent = user.key
            entry.patient = user.key
            entry.action = 'modify'
            entry.put()
        else:
            d['status'] = 'permission denied'
        json_reply(self)
        self.response.write(to_json(d))

    def get(self, user_id):
        user = users.get_current_user()
        prof = model.User.for_user_id(user_id)
        logging.info(user_id)
        d = {}
        if prof:
            d['status'] = 'ok'
            if not has_permissions(prof):
                d['status'] = 'not_permitted'
            else:
                d['payload'] = user_to_dict(prof)
        else:
            d['status'] = 'not found'
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(to_json(d))


class FeedbackUI(webapp2.RequestHandler):

    def get(self):
        t = JINJA.get_template('feedback.html')
        self.response.write(t.render(**get_state()))


class Feedback(webapp2.RequestHandler):

    def post(self):
        feedback = model.Feedback()
        payload = json.loads(self.request.body)
        user = get_state()['user']
        json_reply(self)
        d = dict()
        d['status'] = 'ok'
        if 'feedback' in payload:
            feedback.feedback = payload['feedback']
        if 'user_id' in payload:
            if payload['user_id'] != user.user_id:
                d['status'] = 'insufficient permission'
                self.response.write(to_json(d))
                return
            else:
                feedback.user = user.key
        feedback.put()
        d['feedback'] = feedback.to_dict()
        self.response.write(to_json(d))


app = webapp2.WSGIApplication([
    webapp2.Route('/', handler=Hello),
    webapp2.Route('/urop_submit', handler=UropSubmit),
    webapp2.Route('/urop', handler=UROPCollection),
    webapp2.Route('/api/user/<user_id>', handler=UserHandler),
    webapp2.Route('/host_submit', handler=HostSubmit),
    webapp2.Route('/host', handler=HostCollection),
    webapp2.Route('/user/<user_id>', handler=UserProfile),
    webapp2.Route('/browse', handler=Browse),
    webapp2.Route('/host/<host_id>/urops/<urop_id>', handler=HostUrops),
    webapp2.Route('/dashboard', handler=Dashboard),
    webapp2.Route('/host/<host_id>', handler=Hosts),
    webapp2.Route('/cv/<user_id>', handler=CV),
    webapp2.Route('/feedback', handler=FeedbackUI),
    webapp2.Route('/api/feedback', handler=Feedback),
],
    debug=True)
