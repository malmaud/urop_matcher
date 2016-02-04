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
    return json.dumps(obj.to_dict(), default=json_serial)

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
        urop = model.UROP()
        urop.name = self.request.get('name')
        urop.email = self.request.get('email')
        urop.user_id = users.get_current_user().user_id()
        urop.statement = self.request.get('statement')
        urop.put()
        self.response.write(to_json(urop))

app = webapp2.WSGIApplication([
    webapp2.Route(r'/', handler=Hello),
    webapp2.Route('/urop_submit', handler=UropSubmit),
    webapp2.Route('/do_urop_submit', handler=DoUropSubmit),
],
    debug=True)
