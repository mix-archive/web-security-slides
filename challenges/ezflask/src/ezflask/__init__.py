import json
import uuid

from flask import Flask, request, session


app = Flask(__name__)
app.secret_key = str(uuid.uuid4())


def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, "__getitem__"):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)


class user:
    def __init__(self):
        self.username = ""
        self.password = ""
        pass

    def check(self, data):
        if self.username == data["username"] and self.password == data["password"]:
            return True
        return False


Users = []


@app.route("/register", methods=["POST"])
def register():
    if request.data:
        try:
            data = json.loads(request.data)
            if "username" not in data or "password" not in data:
                return "Register Failed"
            User = user()
            merge(data, User)
            Users.append(User)
        except Exception:
            return "Register Failed"
        return "Register Success"
    else:
        return "Register Failed"


@app.route("/login", methods=["POST"])
def login():
    if request.data:
        try:
            data = json.loads(request.data)
            if "username" not in data or "password" not in data:
                return "Login Failed"
            for user in Users:
                if user.check(data):
                    session["username"] = data["username"]
                    return "Login Success"
        except Exception:
            return "Login Failed"
    return "Login Failed"


@app.route("/", methods=["GET"])
def index():
    return open(__file__, "r").read()
