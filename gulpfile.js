var gulp = require('gulp');
var $ = require("gulp-load-plugins")({lazy:false, pattern: ['gulp-*', 'gulp.*', 'del*', 'handlebars*', 'front*', 
                    'helper-markdown*', 'jsonfile', 'merge-stream', 'event-stream']});
var pkg = require('./package.json');
var Path = require('path');
var fs = require('fs');
var url = require('url');
var _ = require('lodash');
var _s = require('underscore.string');
var cheerio = require('cheerio');

var paths = {
    templates: './src/templates',
    partials: './src/templates/partials',
    less: './src/content/less',
    assets: './src/assets',
    javascript: './src/content/js',
    pages: './src/content/pages',
    posts: './src/content/posts',
    build: './build',
    content: './src/content'
};


var devMode = true;

var siteData;

gulp.task('handlebarshelpers', function() {
  $.handlebars.registerHelper('markdown', require('helper-markdown'));
//  $.handlebars.registerHelper('handlebarsintl', require('handlebars-intl'));

});

gulp.task('sitedata', ['loadsitedata'], function() {
    siteData.posts.sort(postOrderCompare);
    setPostNextPrevious(siteData.posts);
    guaranteeDir(paths.build);
    $.jsonfile.writeFileSync(Path.join(paths.build, 'sitedata.json'), siteData);
    return gulp.src(Path.join(paths.build, 'sitedata.json'));
});

gulp.task('loadsitedata', [], function() {
    siteData = {pages:[], posts:[], devMode:devMode};
    var posts = gulp.src(Path.join(paths.posts, '**/**.hbs'))
        .pipe($.eventStream.map(function(fileData, cb) {
            var content = $.frontMatter(String(fileData.contents));
            var body = content.body;
            content = content.attributes;
            var filePath = Path.parse(fileData.path);
            var relativeDir = Path.relative(paths.posts, filePath.dir);
            var postData = {id:filePath.name, path:relativeDir, title:content.title || filePath.name,  
                url:content.url || false, date:content.date || generateDate(fileData.path), tags:content.tags || '', 
                categories:content.categories || '', published:content.published || false, excerpt:false, 
                nextpostid:false, previouspostid:false, author:content.author || 'Shane' };
            postData.excerpt = postData.excerpt || getExcerptByMoreTag(body);
            siteData.posts.push(postData);
            cb(null, fileData);
          }));
    var pages = gulp.src(Path.join(paths.pages, '**/**.hbs'))
        .pipe($.eventStream.map(function(fileData, cb) {
            var content = $.frontMatter(String(fileData.contents));
            content = content.attributes;
            var filePath = Path.parse(fileData.path);
            var relativeDir = Path.relative(paths.pages, filePath.dir);
            var pageData = {id:filePath.name, path:relativeDir, title:content.title || filePath.name, 
                url:content.url || null, date:content.date || generateDate(fileData.path), tags:content.tags || '', 
                categories:content.categories || '', published:content.published || false};
            siteData.pages.push(pageData);
            cb(null, fileData);
          }));
    return $.mergeStream(posts, pages);
});

gulp.task('partials', ['handlebarshelpers', 'sitedata'], function() {
  return gulp.src(Path.join(paths.partials, '**/**.hbs'))
    .pipe($.tap(function(file) {
      var template = file.contents.toString();
      var templateName = Path.basename(file.path).replace(".hbs", "");
//      console.log("registering partial: "+templateName);
      $.handlebars.registerPartial(templateName, template);
    }))
});

gulp.task('pages', ['partials', 'handlebarshelpers', 'sitedata'], function() {
    return gulp.src(Path.join(paths.pages, '**/**.hbs'))
        .pipe($.data(function(file){
            var content = $.frontMatter(String(file.contents));
            file.contents = new Buffer(content.body);
            return content.attributes;
        }))
        .pipe($.eventStream.map(function(file, cb) {
            var filePath = Path.parse(file.path);
            var pageInfo = _.findWhere(siteData.pages, {id:filePath.name});
            pageInfo = _.extend({}, file.data, pageInfo);
            var template = $.handlebars.compile(String(file.contents));
 //           var context = _.extend({}, pageInfo, siteData);
//            console.log(context);
            var html = template(_.extend({}, pageInfo, siteData), {});
            file.contents = new Buffer(html, "utf-8");
            cb(null, file);
        }))
    .on("error", console.log)
        .pipe($.rename({extname: ".html"}))
        .pipe(gulp.dest(paths.build));
});

gulp.task('posts', ['partials', 'handlebarshelpers', 'sitedata'], function() {
    return gulp.src(Path.join(paths.posts, '**/**.hbs'))
        .pipe($.data(function(file){
            var content = $.frontMatter(String(file.contents));
            file.contents = new Buffer(content.body);
            return content.attributes;
        }))
        .pipe($.eventStream.map(function(file, cb) {
            var filePath = Path.parse(file.path);
            var postInfo = _.findWhere(siteData.posts, {id:filePath.name});
            postInfo = _.extend({}, file.data, postInfo);
            var template = $.handlebars.compile(String(file.contents));
            var html = template(_.extend({}, postInfo, siteData), {});
            file.contents = new Buffer(html, "utf-8");
            cb(null, file);
        }))
        .pipe($.rename({extname: ".html"}))
        .pipe(gulp.dest(Path.join(paths.build, 'posts')));
});

gulp.task('less', [], function () {
    gulp.src(Path.join(paths.less, 'application.less') )
    .pipe($.less({
      paths: [  ]
    }))
    .pipe(gulp.dest(Path.join(paths.build, 'styles')));
});

gulp.task('assets', function() {
    gulp.src(Path.join(paths.assets, '**'))
        .pipe(gulp.dest(Path.join(paths.build)));
});

gulp.task('clean', function() {
    console.log("Clean all files in the build folder");
    $.del( Path.join( paths.build, '**'), function (err, deletedFiles) {
        console.log('Files deleted:',  deletedFiles.join(', '));
    });
});

// Run BrowserSync
gulp.task('serve', ['build', 'watch'], function () {

  $.connect.server({
      port: 8000,
      root: 'build',
  });
});

gulp.task('watch', function () {
    gulp.watch(Path.join(paths.less, '**/**.less'), ['less']);
    gulp.watch(Path.join(paths.pages, '**/**.hbs'), ['pages']);
    gulp.watch(Path.join(paths.templates, '**/**.hbs'), ['pages', 'posts']);
    gulp.watch(Path.join(paths.posts, '**/**.hbs'), ['pages', 'posts']);
    gulp.watch(Path.join(paths.assets, '**'), ['assets']);
});

gulp.task('build', ['less',  'pages', 'posts', 'assets'
                    ]);

gulp.task('default', ['build']);

function generateDate(file) {
    var stat = fs.statSync(file);
    return stat.birthtime;
}

function postOrderCompare(postA, postB) {
    if (postA.date > postB.date) {
        return -1;
    }
    if (postA.date > postB.date) {
        return 1;
    }
    return 0;
}

function setPostNextPrevious(posts) {
    for (var i =0;i<posts.length;i++) {
        if (i > 0) {
            posts[i].previouspostid = posts[i-1].id;
        }
        if (i + 1 < posts.length) {
            posts[i].nextpostid = posts[i+1].id;
        }
    }
}

function guaranteeDir(dir) {    
    try {
 //       fs.accessSync(Path.join(dir, ''), fs.R_OK | fs.W_OK);
    } catch (err) {
//        console.log('err '+err);
 //       fs.mkdirSync(Path.join(dir, ''));
    }
}

function getExcerptByMoreTag(html) {
    var excerpt = false;
    var startString = '<!--start excerpt-->';
    var startPos = html.indexOf(startString);
    var endPos = html.indexOf('<!--end excerpt-->');
    if (startPos > -1 && endPos > -1) {
        excerpt = html.slice(startPos + startString.length, endPos);
        excerpt = '<div>'+excerpt+'</div>';
        var $ = cheerio.load(excerpt);
        excerpt = $('div:root').text();
    }
    return excerpt;
}