#!/usr/bin/env bash
MAX_RETRY_NUM=3

n=0
npm test
while ((n < MAX_RETRY_NUM && $? > 0))
do
  ((n++))
  npm test
done
