from microdot import Microdot

app = Microdot()


@app.get("/")
def index(req):
    """health endpoint used by the testing framework"""
    return 204


@app.post('/check')
def check(req):
    """check if the given request(s) can be processed by this exporter

    arguments:
      input: str  A JSONified string with the input arguments with format
                  {"requests": ParsedRequest[]}

    returns:
      a JSON payload with the format {"return": bool} if successful
      or {"error": "string"} on a failure
    """
    # this example exporter returns true for all requests
    return {"return": True}


@app.post('/convert')
def convert(req):
    """convert the given request(s) to the target language

    arguments:
      input: String  A JSONified string with the input arguments with format
                     {"requests": ParsedRequest[], "options": ConvertOptions}

    returns:
      a JSON payload with the format {"return": "string"} if successful
      or {"error": "string"} on a failure
    """
    # this example exporter returns a comma-separated list of the API names of
    # the given requests
    return {
        "return": ",".join(
            [r["api"] for r in req.json["requests"]]
        )
    }


if __name__ == '__main__':
    app.run()
