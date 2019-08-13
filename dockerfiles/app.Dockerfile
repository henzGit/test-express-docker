# base image
FROM node:10.16.2

# set environment variable
ENV WORKING_DIR=/app

# set working directory
RUN mkdir $WORKING_DIR
WORKDIR $WORKING_DIR

# add `/usr/src/app/node_modules/.bin` to $PATH
ENV PATH $WORKING_DIR/node_modules/.bin:$PATH

# install and cache app dependencies
COPY scripts/ /scripts

# export container port
EXPOSE 3000