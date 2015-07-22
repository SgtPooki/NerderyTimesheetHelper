/**
 * The project gulpfile.js
 *
 * @fileOverview
 * @author Russell Dempsey <SgtPooki@gmail.com>
 */

var gulp = require('gulp');
var glob = require('glob');
var _ = require('lodash');

var gulpTaskPaths = glob.sync('./tasks/*.js', {});

var getFilenameFromPath = function getFilenameFromPath(path) {
    return path.split('/').slice(-1)[0].replace('.js', '');
};

gulpTaskPaths.forEach(function (filePath) {
    var gulpTask = require(filePath.replace('.js', ''));
    var taskName = getFilenameFromPath(filePath);

    gulp.task(taskName, gulpTask.dependencies, function (cb) {
        //immediately prior to task start
        gulpTask.task.call(null, gulp, function () {
            //immediately after task completion
            cb();
        });
    });
});
