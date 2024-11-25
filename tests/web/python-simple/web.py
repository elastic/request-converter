from microdot import Microdot

app = Microdot()


@app.post('/check')
def check(req):
    return {"return": True}


@app.post('/convert')
def convert(req):
    return {
        "return": ",".join(
            [r["api"] for r in req.json["requests"]]
        )
    }


if __name__ == '__main__':
    app.run()
