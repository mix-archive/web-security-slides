from sanic import Sanic
from sanic.response import text, html
from sanic_session import Session
import pydash  # pydash<6.0.0


class Pollute:
    def __init__(self):
        pass


app = Sanic(__name__)
app.static("/static/", "./static/")
Session(app)


@app.route("/", methods=["GET", "POST"])
async def index(request):
    return html(open("static/index.html").read())


@app.route("/login")
async def login(request):
    user = request.cookies.get("user")
    if user.lower() == "adm;n":
        request.ctx.session["admin"] = True
        return text("login success")

    return text("login fail")


@app.route("/src")
async def src(request):
    return text(open(__file__).read())


@app.route("/admin", methods=["GET", "POST"])
async def admin(request):
    if request.ctx.session.get("admin") == True:
        key = request.json["key"]
        value = request.json["value"]
        if key and value and type(key) is str and "_." not in key:
            pollute = Pollute()
            pydash.set_(pollute, key, value)
            return text("success")
        else:
            return text("forbidden")

    return text("forbidden")
