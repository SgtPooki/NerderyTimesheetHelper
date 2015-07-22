/**
 * The eslint gulp task
 *
 * @author Russell Dempsey <SgtPooki@gmail.com>
 */

var eslint = require('eslint');
var glob = require('glob');

var eslintCli = new eslint.CLIEngine();
var formatter = eslintCli.getFormatter();

var gulpTask = {
    dependencies: [],
    task: function (gulp, cb) {
        'use strict';

        glob('{./,src/**/,tasks/}*.js', {}, function (er, files) {
            var report = eslintCli.executeOnFiles(files);

            if (report.errorCount + report.warningCount > 0) {
                console.log(formatter(report.results));
            }

            cb();
        });
    }
};

module.exports = gulpTask;
