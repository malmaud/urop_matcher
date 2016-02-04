import webapp2
import jinja2
import os
import logging
import json
from google.appengine.api import users
import datetime

import model

JINJA = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

def to_json(obj):
    def json_serial(obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        raise TypeError("")
    return json.dumps(obj, default=json_serial)

class Hello(webapp2.RequestHandler):
    def get(self):
        t = JINJA.get_template('main.html')
        self.response.write(t.render(name='', age=self.request.get('age',0)))

class UropSubmit(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:
            t = JINJA.get_template('urop_submit.html')
            self.response.write(t.render(email=user.email()))
        else:
            t = JINJA.get_template('login.html')
            url = users.create_login_url('/urop_submit')
            self.response.write(t.render(login_url=url))

class DoUropSubmit(webapp2.RequestHandler):
    def post(self):
        logging.info("registering user")
        urop = model.User()
        data = json.loads(self.request.body)
        urop.name = data['name']
        urop.email = data['email']
        urop.user_id = users.get_current_user().user_id()
        urop.statement = data['statement']
        urop.put()
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(to_json(urop.to_dict()))

class HostSubmit(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:
            t = JINJA.get_template('host_register.html')
            self.response.write(t.render(email=user.email()))
        else:
            t = JINJA.get_template('login.html')
            url = users.create_login_url('/host_submit')
            self.response.write(t.render(login_url=url))

class DoHostSubmit(webapp2.RequestHandler):
    def post(self):
        host = model.User()
        data = json.loads(self.request.body)
        host.name = data['name']
        host.email = data['email']
        host.research = data['research']
        host.user_id = users.get_current_user().user_id()
        host.approved = False
        host.put()
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(to_json(host.to_dict()))

def get_user():
    user_id = users.get_current_user()
    return model.User.for_user_id(user_id.user_id())

def has_permissions(profile):
    user = get_user()
    return True  # todo: fill in

class GetUserProfile(webapp2.RequestHandler):
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
                d['payload'] = prof.to_dict()
        else:
            d['status'] = 'not found'
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(to_json(d))

class UserProfile(webapp2.RequestHandler):
    def get(self, user_id):
        t = JINJA.get_template('user_profile.html')
        self.response.write(t.render(user_id=user_id))

app = webapp2.WSGIApplication([
    webapp2.Route('/', handler=Hello),
    webapp2.Route('/urop_submit', handler=UropSubmit),
    webapp2.Route('/do_urop_submit', handler=DoUropSubmit),
    webapp2.Route('/host_submit', handler=HostSubmit),
    webapp2.Route('/do_host_submit', handler=DoHostSubmit),
    webapp2.Route('/user_profile/get/<user_id>', handler=GetUserProfile),
    webapp2.Route('/user/<user_id>', handler=UserProfile),
],
    debug=True)
