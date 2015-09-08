/**
 * The scripts gulp task
 *
 * @author Russell Dempsey <SgtPooki@gmail.com>
 */

// var uglify = require('gulp-uglify');
var browserify = require('gulp-browserify');

var gulpTask = {
    dependencies: [],
    task: function scriptsTask(gulp, cb) {
        gulp.src('src/js/app.js')
            .pipe(browserify({
              insertGlobals: true,
              debug: !gulp.env.production
            }))
            .pipe(gulp.dest('./build/js'));
        cb();
    }
};

module.exports = gulpTask;
