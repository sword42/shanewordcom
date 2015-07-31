var gulp = require('gulp');
var $ = require("gulp-load-plugins")({lazy:false, pattern: ['gulp-*', 'gulp.*', 'del*', 'handlebars*', 'front*', 'marked*']});
var pkg = require('./package.json');
var Path = require('path');
var fs = require('fs');
var es = require('event-stream');
var url = require('url');
var browserSync = require('browser-sync');

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

gulp.task('partials', [], function() {
  return gulp.src(Path.join(paths.partials, '**/**.hbs'))
    .pipe($.tap(function(file) {
      var template = file.contents.toString();
      var templateName = Path.basename(file.path).replace(".hbs", "");
//      console.log("registering partial: "+templateName);
      $.handlebars.registerPartial(templateName, template);
    }))
});

gulp.task('pages', ['partials', 'less'], function() {
    return gulp.src(Path.join(paths.pages, '**/**.hbs'))
        .pipe($.data(function(file){
            var content = $.frontMatter(String(file.contents));
            file.contents = new Buffer(content.body);
//            file.contents = new Buffer($.marked(content.body)); no markup for now
            return content.attributes;
        }))
        .pipe(es.map(function(file, cb) {
            file.data.body = String(file.contents);
            file.data.devMode = devMode;

//            var templateName = file.data.template || 'default.hbs';
//            var templateData = String(fs.readFileSync(Path.join(paths.templates, templateName)));
//            console.log("templateData for: "+templateName+" is: "+templateData);
//            var template = $.handlebars.compile(templateData);
            var template = $.handlebars.compile(file.data.body);
            var html = template(file.data, {});
//            console.log("html : "+html);
            file.contents = new Buffer(html, "utf-8");
            cb(null, file);
        }))
        .pipe($.rename({extname: ".html"}))
        .pipe(gulp.dest(paths.build));
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
    gulp.watch(Path.join(paths.pages, '**/**.md'), ['pages']);
    gulp.watch(Path.join(paths.templates, '**/**.hbs'), ['pages']);
    gulp.watch(Path.join(paths.assets, '**'), ['assets']);
});

gulp.task('build', ['less',  'pages'
                    ]);

gulp.task('default', ['build']);