/**
 * The build gulp task
 *
 * @author Russell Dempsey <SgtPooki@gmail.com>
 */

var webpack = require('webpack');

var webpackConfig = {
  context: './',
  entry: {
    vendor: [
      './lib/jquery.min.js',
      './lib/underscore.min.js',
      './lib/moment.min.js'
    ],
    background: [
        './src/js/background.js'
    ],
    content: [
        // './css/options.css',
        // './images/icon.png',
        './src/js/content.js',
        './src/js/keybindings.js',
        './src/js/options.js'
    ]
  },
  output: {
    path: './chrome/build/',
    filename: '[name].js'
  },
  module: {
    loaders: [
      {
        test: /\.css$/,
        loader: 'css!'
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loader: 'url?limit=10000!img?progressive=true'
      }
    ]
  }
};

var gulpTask = {
    dependencies: [],
    /**
     * Builds the project using webpack.
     *
     * @param  {[type]}   gulp [description]
     * @param  {Function} cb   [description]
     *
     * @returns {void}  returns nothing
     */
    task: function buildTask(gulp, cb) {
        webpack(
            webpackConfig,
            function webpackCallback(fatalError, stats) {
                var jsonStats = {
                    errors: [],
                    warnings: []
                };

                if (jsonStats) {
                    jsonStats = stats.toJson();
                }

                if (fatalError || jsonStats.errors.length > 0) {
                    console.log(fatalError, jsonStats.errors);
                    return cb('Error');
                }
                if(jsonStats.warnings.length > 0) {
                    console.log(jsonStats.warnings);
                    return cb('Warning');
                }

                cb();
            }
        );
    }
};

module.exports = gulpTask;
