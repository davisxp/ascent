#!/usr/bin/env python3
"""Assemble life-site/index.html from the sources in this folder.
   Usage:  python3 build.py            (from the src/ directory)"""
import os
here = os.path.dirname(os.path.abspath(__file__))
head = open(os.path.join(here, 'head.html')).read()
body = open(os.path.join(here, 'body.html')).read()
data = open(os.path.join(here, 'data.json')).read().strip()
app1 = open(os.path.join(here, 'app1.js')).read()
app2 = open(os.path.join(here, 'app2.js')).read()
app = app1 + app2
assert '</script' not in data.lower() and '</script' not in app.lower()
html = head + body.replace('__DATA__', data).replace('__APP__', app)
out = os.path.join(here, '..', 'index.html')
open(out, 'w').write(html)
print('wrote', out, len(html), 'bytes')
