var fs = require('fs'),
    async = require('async'),
    path = require('path'),

    layoutMap = {
        vertical: 'top-down',
        horizontal: 'left-right',
        default: 'binary-tree'
    };

function ExtFormat() {
    this.formatObj = {};
}
ExtFormat.prototype = {
    'add': function (name, val) {
        this.formatObj[name] = val;
    },
    'get': function (filepath) {
        // Grab the extension from the filepath
        var ext = path.extname(filepath),
            lowerExt = ext.toLowerCase();

        // Look up the file extension from our format object
        var formatObj = this.formatObj,
            format = formatObj[lowerExt];
        return format;
    }
};

module.exports = function(grunt) {

    var Builder = require('./libs/builder');

    grunt.registerMultiTask('spritegen', 'Compile images to sprite sheet', function() {
        var options = this.options({
                justResize: false,
                layoutType: 'default'
            }),
            done = this.async(),
            srcFiles;

        grunt.verbose.writeflags(options, 'Options');

        if (!layoutMap.hasOwnProperty(options.layoutType)) {
            grunt.fatal('there are no layoutType called "' + options.layoutType + '"!');
        }

        options.layoutType = layoutMap[options.layoutType];

        async.forEachSeries(this.files, function(file, callback) {

            var files = [],
                builder;

            srcFiles = grunt.file.expand(file.src);

            [].forEach.call(srcFiles, function(file) {
                if (fs.statSync(file).isFile()) {
                    files.push(file);
                }
            });

            options.images = files;
            options.outputBasePath = file.dest;

            builder = new Builder(options);
            builder.build(callback);

        }, done);
    });
};
