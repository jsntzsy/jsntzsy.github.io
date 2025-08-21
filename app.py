from flask import Flask, render_template, redirect

app = Flask(__name__, static_folder="ham-exam")


@app.route("/")
def index():
    return redirect("/ham-exam/index.html")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
