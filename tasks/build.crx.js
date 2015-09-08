/**
 * The crx build gulp task
 *
 * Builds the chrome extension crx file
 *
 * @author Russell Dempsey <SgtPooki@gmail.com>
 */

var ChromeExtension = require('crx');
var fsp = require('fs-promise');
var path = require('path');

var crxConfig = {
    codebase: 'https://github.com/SgtPooki/NerderyTimesheetHelper/raw/master/bin/NerderyTimesheetHelper.crx'
};

var gulpTask = {
    dependencies: ['build'],
    task: function (gulp, cb) {
        'use strict';

        fsp.readFile(path.join(__dirname, '../NerderyTimesheetHelper.pem'), {encoding: 'utf8'})
            .then(function (privateKeyFile) {
                crxConfig.privateKey = privateKeyFile;

                return new ChromeExtension(crxConfig);
            })
            .catch(function () {
                console.log();
                console.log('You must copy the NerderyTimesheetHelper.pem to the project root before you can build the crx.');
                console.log();
            })
            .then(function (crx) {
                return crx.load(path.join(__dirname, '../chrome'))
                    .then(function () {
                        crx.pack()
                        .then(function (crxBuffer) {

                            return fsp.writeFile(path.join(__dirname, '../bin/NerderyTimesheetHelper.crx'), crxBuffer);
                        })
                        .catch(function (err) {
                            console.log(err);
                        })
                        .then(function () {
                            console.log('Built crx file successfully');
                        });
                    });
            })
            .then(cb);
    }
};

module.exports = gulpTask;
//
// var join = require('path').join;
// var crx = new ChromeExtension(
//   codebase: 'http://localhost:8000/myFirstExtension.crx',
//   privateKey: fs.readFileSync(join(__dirname, 'key.pem'))
// });
//
// crx.load(join(__dirname, 'myFirstExtension'))
//   .then(function() {
//     return crx.pack().then(function(crxBuffer){
//       var updateXML = crx.generateUpdateXML()
//
//       fs.writeFile(join(__dirname, 'update.xml'), updateXML)
//       fs.writeFile(join(__dirname, 'myFirstExtension.crx'), crxBuffer)
//     })
//   });
