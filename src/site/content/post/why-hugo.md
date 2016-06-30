+++
date = "2016-05-01T15:02:19-07:00"
draft = false
title = "Why Hugo"
author = "Shane"
description = "Why Hugo"
headerimage = "/img/photo-1431057499046-ecd6e0f36ebe-lg.jpg"
headertitle = "Why Hugo"
darkenheader = true
+++

I recently moved this site over to [Hugo](https://gohugo.io/).

Hugo is a static site generator, like Jekyll. Static Site Generators allow website content to be generated when the content changes, instead of when the user requests it. Since content changes are more infrequent, this change reduces the amount of work the system needs to do. For things that do change on user request (User Name, Login status, etc), Javascript can be used to dynamically add whatever content (which should hopefully be small).

## What's Different about Hugo

Hugo is distributed as a single, simple, executable file for each operating system (Windows, Mac, Linux, etc). There's no complex installation or dependencies to manage. You should know how to set your command line path to call the executable, but other than that, its ready to go.

Hugo generates the site very quickly. Its a fast and efficient program (Written in Go). It also has a built in "server" for development, which lets you view a generated version of the site locally while you're working on it, with live updates.

## How is Hugo Structured?

Hugo, like any static site generator, allows "content" to be developed and assembled with "templates" into pages/posts. It allows static (non generated) content to be added to the site as well, and includes both the generated and static items together in a generated output location.

The most common form of content is markdown files, with "front matter" metadata about the file at the top, and the "body" at the bottom. Hugo looks at the content file directory location in an attempt to find the right "template" for the file. The content file directory defines for Hugo the "section" or "type" for the content, although that type can be changed in the metadata.

To avoid as much duplication as possible, Hugo allows templates, along with static files, to be grouped together as a named "theme". A site can only use a single theme, but using a theme allows you to depend on the theme's templates and static files, and reduce your site's template or static items. If you don't want to use all the theme's items, only some, then you can overwrite those template or static items directly in your site's layout or static directory. There is no requirement to use themes though. You can put all your items directly into your site's directory, which might be a good idea if you don't expect them to be reused on other sites.

## But what are the templates?

Each template is a "view" or a rendering of a content item, or any other piece of the site that needs to be dynamically rendered. A content item might have different rendered views, depending on what's needed for a situation. You might need a rendering of a post with high level details or a summary for a list view, and you might need a rendering of the entire post on the page where the post is going to be read in full.

Templates can also be part of a larger template. By using these "partial" templates, a site can minimize duplication between templates. The goal is to be able to tie together the site, and all the templates needed for it, without having to explicitly define the template mapping. To do this, Hugo depends on conventions for the location of referenced templates.

The templates are stored under layouts, either your site's layouts directory, or the theme's layout directory. Hugo has a prioritization order for determining the correct layout to use for an item. The prioritization is:

- Your site's layout directory, with an exact match to type and view
- Your site's layout directory, in the default folder
- The theme's layout directory, with an exact match to type and view
- The theme's layout directory, in the default folder

## How does this all work together?

Hugo uses the config file to setup the process and add any high level parameters for the generation. It loads the information about the pages/posts under content, as well as special pages like the homepage and sitemap, so all the information will be available during page generation. It then goes through and generates the results, using the content and templates together. It copies over the static content, and the result is all the site content needed to deploy to a webserver.

## Limitations?

Hugo gets some great benefits with the Go programming language, like fast execution and cross platform executables, but there are some areas where Go has limited Hugo.

Most Hugo templates are developed using the Go templating language, which is pretty good, but doesn't have all the features or examples that other more popular templating languages have. Other templating languages for Go, like Ace and Amber are available, but many more popular options, like Mustache and Jade are not available.

Template Functions are another area of concern. Go Template functions are available, but any custom functions need to be developed in Go, which is fine for Go Programmers, but anyone not used to Go would have more issues. Thankfully, most functions required to build a site are already included, either in Go Templates, or through custom Hugo implementations.

## Why use a generator at all?

For awhile, I was using custom Javascript build functions to assemble sites. That works, but all of the higher level organization needs, and implementations have to be custom developed, and at some point, your not writing sites, your writing your own static site generator. Its not impossible to do, but of your you need to decide where you want to spend your time.
