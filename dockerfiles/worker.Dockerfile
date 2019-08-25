FROM python:3.7.4

WORKDIR /app/
ADD ./worker/ /app/

RUN pip3 install -r requirements.txt