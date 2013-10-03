var fs = require('fs'),
    exec = require('child_process').exec,
    async = require('async'),
    path = require('path'),
    qfs = require('q-fs'),
    _ = require('underscore'),
    mustache = require('mustache'),

    ImageMagick = require('../lib/imagemagick'),
    Style = require('../lib/style'),
    Layout = require('../lib/layout'),

    separator = path.sep || '/';

module.exports = function(grunt) {
    'use strict';

    /**
     * write style sheet file
     * @param options
     * @param callback
     * @returns {*}
     */
    var writeStyleSheet = function(options, callback) {
        var that = this,
            templateData = {},
            template = fs.readFileSync(options.templateUrl || __dirname + '/../tasks/template.mustache', 'utf8'),
            result;

        options.configs.forEach(function(config) {
            if (config.name.toLowerCase() === 'legacy') {

                templateData.legacy = config.css;

            } else if (config.name.toLowerCase() === 'retina') {

                templateData.retina = config.css;
            }
        });

        result = mustache.render(template, templateData);

        return fs.writeFile(options.outputStyleFilePath, result, function(err) {
            if (err) {
                throw err;
            } else {
                console.log('CSS file written to ', options.outputStyleFilePath);
                return callback();
            }
        });
    };

    var writeSpriteImage = function() {

    };

    grunt.registerMultiTask('sgen', 'Compile images to sprite sheet', function() {
        var options = this.options(),
            done = this.async(),
            srcFiles;

        grunt.verbose.writeflags(options, 'Options');

        grunt.util.async.forEachSeries(this.files, function(file, callback) {
            var builder,
                dir = '',
                files = [],
                f;

            srcFiles = grunt.file.expand(file.src);

            srcFiles.forEach(function(file) {
                f = dir + file;

                if (fs.statSync(f).isFile()) {
                    files.push(f);
                }
            });

            options.images = files;
            options.outputDirectory = dir + file.dest;


        }, done);


    });
};