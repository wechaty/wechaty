#!/usr/bin/env bash
#
# https://github.com/Chatie/wechaty/issues/1084
# WebDriver / Puppeteer sometimes will fail(i.e. timeout) with no reason.
# That will cause the unit tests fail randomly.
# So we need to retry again when unit tests fail,
# and treat it's really fail after MAX_RETRY_NUM times.

MAX_RETRY_NUM=3

echo "Safe Test: starting..."

n=0
npm test
while ((n < MAX_RETRY_NUM && $? > 0))
do
  ((n++))
  echo "Safe Test: retrying $n times..."
  npm test
done
