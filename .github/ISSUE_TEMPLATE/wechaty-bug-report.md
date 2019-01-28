---
name: Wechaty Bug Report
about: Create a bug report for a bug you found in wechaty

---

> Important：Please file the issue follow the template, or we won't help you to solve the problem.


## 0. Report Issue Guide

1. Please run the following command and check whether the problem has been fixed：
```
rm -rf package-lock.json
rm -rf node_modules
npm install
```

2. Please search in [FAQ List](https://docs.chatie.io/faq) first, and make sure your problem has not been solved before.

3. Please search in the issue first, and make sure your problem had not been reported before

## 1. Versions
- What is your wechaty version?
Answer:

- Which puppet are you using for wechaty? (padchat/puppeteer/padpro/...)
Answer:

- What is your wechaty-puppet-XXX（padchat/puppeteer/） version?
Answer:

- What is your node version? (run `node --version`)
Answer:

- What os are you using
Answer:

## 2. Describe the bug
Give a clear and concise description of what the bug is.

## 3. To Reproduce
This part is very important: if you can not provide any reproduce steps, then the problem will be very hard to be recognized.

Steps to reproduce the behavior:
1. run '...'
2. ...
3. ...

## 4. Expected behavior
Give a clear and concise description of what you expected to happen.

## 5. Actual behavior
If applicable, add screenshots to help explain your problem. But do not paste log screenshots here.


## 6. Full Output Logs
Set env `WECHATY_LOG=silly` in order to set log level to silly, then we can get the full log (If you dosen't set log env, log level is info as default, we cannot get the full log)

**We need full log instead of log screenshot or log fragments!**

<details>
<summary>
Show Logs
</summary>

```shell
$ WECHATY_LOG=silly node yourbot.js

Question: Paste your FULL(DO NOT ONLY PROVIDE FRAGMENTS) log messages
Answer:

```

</details>

## 7. Additional context
Add any other context about the problem here.

[bug]
