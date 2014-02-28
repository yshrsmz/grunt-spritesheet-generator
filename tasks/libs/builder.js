var im = require('imagemagick'),
    _ = require('underscore'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    qfs = require('q-io/fs'),
    Layout = require('layout'),

    // console colors
    colorRed = '\u001b[31m',
    colorGreen = '\u001b[32m',
    colorReset = '\u001b[0m';

function getFileNameWithoutExtension(path) {
    var ary = path.split('/'),
        fileName = ary[ary.length - 1],
        fileNameAry = fileName.split('.'),
        result = fileNameAry[0];

    return result;
}

function Builder(options) {
    this.options = options;
    this.outputDirectory = path.resolve(options.outputBasePath);
    this.spriteConfigs = {};
    this.baseSpriteConfig = void 0;
    this.justResize = options.justResize;

    this.outputStyleFilePath = path.resolve(this.outputDirectory, options.outputCss);
    this.outputStyleDirectoryPath = path.dirname(this.outputStyleFilePath);

    // add retina config
    this.makeSpriteConfig('retina');

    // add legacy config
    this.makeSpriteConfig('legacy');
};

Builder.prototype.makeSpriteConfig = function(type) {
    var that = this,
        config;

    if (that.options.output.hasOwnProperty(type) && that.options.output[type].hasOwnProperty('outputImage')) {
        config = {
            outputDirectory: that.outputDirectory,
            files: that.options.images,
            spIdentifier: that.options.spIdentifier || getFileNameWithoutExtension(that.options.outputCss),
            downsampling: that.options.downsampling,
            pixelRatio: that.options.output[type].pixelRatio || 1,
            justResize: that.options.justResize,
            layout: that.options.layoutType
        }
        if (!this.baseSpriteConfig || config.pixelRatio > this.baseSpriteConfig.pixelRatio) {
            this.baseSpriteConfig = config;
        }
        that.spriteConfigs[type] = config;
    }
};

Builder.prototype.build = function(done) {
    var that = this,
        keys = Object.keys(that.spriteConfigs),
        config;

    that.configs = [];

    for (var i = 0, len = keys.length; i < len; i++) {
        config = that.spriteConfigs[keys[i]];
        config.baseRatio = config.pixelRatio / that.baseSpriteConfig.pixelRatio;
        that.configs.push(config);
    }

    this.configs = this.configs.sort(function(a, b) {
        if (a.pixelRatio > b.pixelRatio) {
            return -1
        } else if (a.pixelRatio < b.pixelRatio) {
            return 1;
        }
        return 0;
    });

    async.series([
        function(callback) {
            async.forEachSeries(that.configs, that.compile.bind(that), callback);
        },
        that.compositeSprite.bind(that),
        that.writeStyleSheet.bind(that),
        that.summaryErrors.bind(that)], done);
};

Builder.prototype.compile = function(config, callback) {
    var that = this,
        layer = new Layout(config.layout);

    config.imageData = [];

    async.forEachSeries(config.files, function(file, cb) {
        var that = this;

        im.identify(file, function(err, image) {
            if ( err ) {
                console.log('Image Identify check error! file: ' + file);
            }
            config.imageData.push({
                name: path.basename(image.artifacts.filename.split('.')[0]),
                width: image.width * config.baseRatio,
                height: image.height * config.baseRatio
            });
            cb();
        });
    }, callback);
};

Builder.prototype.compositeSprite = function(callback) {
    var that = this;

    async.forEachSeries(that.configs, function(config, cb) {
        var layer = new Layout(config.layout);

        config.imageData.forEach(function(image) {
            layer.addItem({
                height: image.height,
                width: image.width,
                meta: image.name
            });
        });

        var info = layer.export();

        cb();
    }, callback)
};

Builder.prototype.writeStyleSheet = function(cb) {
    cb();
};

Builder.prototype.summaryErrors = function(cb) {
    cb();
};

module.exports = Builder;