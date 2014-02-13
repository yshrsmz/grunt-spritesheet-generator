var fs = require('fs');

module.exports = function(grunt) {
    'use strict';

    var Builder = require('./lib/builder');

    grunt.registerMultiTask('spritegen', 'Compile images to sprite sheet', function() {
        var options = this.options({
                justResize: false
            }),
            done = this.async(),
            srcFiles;

        grunt.verbose.writeflags(options, 'Options');

        grunt.util.async.forEachSeries(this.files, function(file, callback) {
            var builder,
                dir = '',
                files = [],
                f;

            srcFiles = grunt.file.expand(file.src);

            [].forEach.call(srcFiles, function(file) {
                f = dir + file;

                if (fs.statSync(f).isFile()) {
                    files.push(f);
                }
            });

            options.images = files;
            options.outputDirectory = dir + file.dest;

            builder = Builder.fromGruntTask(options);
            builder.build(callback);
        },
        done);

    });
};