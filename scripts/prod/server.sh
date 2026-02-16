#!/usr/bin/env bash
cd /var/projects/fasting-tracker
source venv/bin/activate
exec gunicorn --bind unix:/run/fasting-tracker.sock run:app
