from google.appengine.ext import ndb

class User(ndb.Model):
    name = ndb.StringProperty()
    email = ndb.StringProperty()
    date_uploaded = ndb.DateTimeProperty(auto_now_add=True)
    date_modified = ndb.DateTimeProperty(auto_now=True)
    user_id = ndb.StringProperty()

class UROP(User):
    statement = ndb.TextProperty()
    year = ndb.StringProperty()

class Host(User):
    pass
