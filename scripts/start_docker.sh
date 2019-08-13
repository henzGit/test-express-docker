#!/usr/bin/env bash
if [ ! -d "node_modules" ]; then
  echo "installing node modules"
  yarn install
fi
yarn start
