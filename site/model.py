from google.appengine.ext import ndb


class User(ndb.Model):
    name = ndb.StringProperty()
    email = ndb.StringProperty()
    date_uploaded = ndb.DateTimeProperty(auto_now_add=True)
    date_modified = ndb.DateTimeProperty(auto_now=True)
    user_id = ndb.StringProperty()
    kind = ndb.StringProperty()
    statement = ndb.TextProperty()
    year = ndb.StringProperty()
    approved = ndb.BooleanProperty()
    research = ndb.TextProperty()
    host = ndb.KeyProperty(kind='User')
    cv = ndb.StringProperty()
    lab = ndb.StringProperty()

    @classmethod
    def for_user_id(kls, user_id):
        return kls.query(kls.user_id == user_id).get()

    def get_urops(self):
        return User.query(User.host == self.key)

    @classmethod
    def for_lab(kls, lab):
        return kls.query(kls.lab == lab)


class LogEntry(ndb.Expando):
    date_created = ndb.DateTimeProperty(auto_now_add=True)


class Feedback(ndb.Model):
    feedback = ndb.TextProperty()
    user = ndb.KeyProperty(User)
    date_created = ndb.DateTimeProperty(auto_now_add=True)
