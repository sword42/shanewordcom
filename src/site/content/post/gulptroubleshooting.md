+++
date = "2015-08-08T15:02:07-07:00"
draft = false
title = "Gulp Troubleshooting"
aliases = ["/posts/gulptroubleshooting.html"]
author = "Shane"
description = "Easy way to see gulp errors"
headerimage = "/img/mountainsunset-lg.jpg"
headertitle = "Gulp Troubleshooting"
+++

When you've got a gulp problem, and one of your build tasks isn't completing, one easy way to see what's going on is to add .on("error", console.log) into your pipe chain after that spot where you think you've got an error, or at the end of your task.  Then, when it reaches that error point, you'll get something written out to your log telling you what could be going on.  The details for this come from [http://hmphry.com/error-handling-in-gulp-js](http://hmphry.com/error-handling-in-gulp-js)
