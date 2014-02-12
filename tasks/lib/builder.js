var ImageMagick = require('./imagemagick'),
    Layout = require('./layout'),
    Layout_vertical = require('./layout_vertical'),
    Layout_horizontal = require('./layout_horizontal'),
    Style = require('./style'),
    async = require('async'),
    ensureDirectory,
    exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    qfs = require('q-fs'),
    separator = path.sep || '/',
    _ = require('underscore'),
    mustache = require('mustache'),
    SpriteSheetBuilder,
    SpriteSheetConfiguration,

    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };


ensureDirectory = function(directory) {
    return function(callback) {
        return qfs.isDirectory(directory).then(function(isDir) {
            if (isDir) {
                return callback();
            } else {
                return qfs.makeTree(directory).then(callback);
            }
        });
    };
};

getFileNameWithoutExtension = function(path) {
    var ary = path.split('/'),
        fileName = ary[ary.length - 1],
        fileNameAry = fileName.split('.'),
        result = fileNameAry[0];

    return result;
}

SpriteSheetBuilder = (function() {


    function SpriteSheetBuilder(options) {
        this.options = options;
        this.writeStyleSheet = __bind(this.writeStyleSheet, this);
        this.buildConfig = __bind(this.buildConfig, this);
        this.files = options.images;
        this.outputConfigurations = {};
        this.outputDirectory = path.resolve(options.outputDirectory);
        this.justResize = options.justResize || true;

        if (options.outputCss) {
            this.outputStyleFilePath = [this.outputDirectory, options.outputCss].join(separator);
            this.outputStyleDirectoryPath = path.dirname(this.outputStyleFilePath);
        }
    }

    SpriteSheetBuilder.prototype.addConfiguration = function(name, options) {
        var baseConfig, config, ssc;

        config = _.extend(this.options, options, {
            name: name,
            outputStyleFilePath: this.outputStyleFilePath,
            outputStyleDirectoryPath: this.outputStyleDirectoryPath
        });

        ssc = new SpriteSheetConfiguration(options.images || this.files, config);
        this.outputConfigurations[name] = ssc;

        if (!baseConfig || config.pixelRatio > baseConfig.pixelRatio) {
            baseConfig = config;
        }
        return ssc;
    };

    SpriteSheetBuilder.prototype.build = function(done) {
        var baseConfig, config, key,
            _this = this;

        if (!this.outputStyleFilePath) {
            throw "no output style file specified";
        }

        if (Object.keys(this.outputConfigurations).length === 0) {
            this.addConfiguration("default", {
                pixelRatio: 1
            });
        }

        this.configs = [];
        baseConfig = null;

        for (key in this.outputConfigurations) {
            config = this.outputConfigurations[key];
            if (!baseConfig || config.pixelRatio > baseConfig.pixelRatio) {
                baseConfig = config;
            }
            this.configs.push(config);
        }

        SpriteSheetConfiguration.baseConfiguration = baseConfig;

        // sort configs by pixelRatio
        this.configs = this.configs.sort(function(a, b) {
            if (a.pixelRatio > b.pixelRatio) {
                return -1
            } else if (a.pixelRatio < b.pixelRatio) {
                return 1;
            }
            return 0;
        });

        return async.series([
            function(callback) {
                return async.forEachSeries(_this.configs, _this.buildConfig, callback);
            }, ensureDirectory(this.outputStyleDirectoryPath), this.writeStyleSheet
        ], done);
    };

    SpriteSheetBuilder.prototype.buildConfig = function(config, callback) {
        return config.build(callback);
    };

    SpriteSheetBuilder.prototype.writeStyleSheet = function(callback) {
        var retinaConfig,
            _this = this,
            templateData = {},
            template = fs.readFileSync(this.options.templateUrl || __dirname + '/../template_placeholder.mustache', 'utf8'),
            result,
            style;

        retinaConfig = this.configs.filter(function(config) {
            if (config.name.toLowerCase() === 'retina') {
                return true;
            }
        });

        [].forEach.call(_this.configs, function(config) {
            if (config.name.toLowerCase() === 'legacy') {
                if (_this.justResize && (Object.keys(config.css)).length < 1) {
                    templateData.legacy = {
                        imageHeight: retinaConfig[0].css.imageHeight,
                        imagePath: retinaConfig[0].css.imagePath,
                        imageWidth: retinaConfig[0].css.imageWidth,
                        pixelRatio: config.pixelRatio,
                        spIdentifier: retinaConfig[0].css.spIdentifier,
                        styles: []
                    };

                    for (var i = 0, len = retinaConfig[0].css.styles.length; i < len; i++) {
                        style = retinaConfig[0].css.styles[i];
                        templateData.legacy.styles.push({
                            height: style.height * config.baseRatio,
                            imageHeight: style.imageHeight,
                            imagePath: style.imagePath,
                            imageWidth: style.imageWidth,
                            name: style.name,
                            pixelRatio: config.pixelRatio,
                            spIdentifier: style.spIdentifier,
                            width: style.width * config.baseRatio,
                            x: style.x,
                            y: style.y
                        });
                    }
                } else {
                    templateData.legacy = config.css;
                }
            } else if (config.name.toLowerCase() === 'retina') {
                templateData.retina = config.css;
            }
        });

        result = mustache.render(template, templateData);


        return fs.writeFile(this.outputStyleFilePath, result, function(err) {
            if (err) {
                throw err;
            } else {
                console.log("CSS file written to", _this.outputStyleFilePath, "\n");
                return callback();
            }
        });
    };

    SpriteSheetBuilder.supportsPngcrush = function(callback) {
        var _this = this;
        return exec("which pngcrush", function(error, stdout, stderr) {
            return callback(stdout && !error && !stderr);
        });
    };

    SpriteSheetBuilder.pngcrush = function(image, callback) {
        return SpriteSheetBuilder.supportsPngcrush(function(supported) {
            var crushed,
                _this = this;
            if (supported) {
                crushed = "" + image + ".crushed";
                console.log("\n  pngcrushing, this may take a few moments...\n");
                return exec("pngcrush -reduce " + image + " " + crushed + " && mv " + crushed + " " + image, function(error, stdout, stderr) {
                    return callback();
                });
            } else {
                return callback();
            }
        });
    };

    SpriteSheetBuilder.fromGruntTask = function(options) {
        var builder, config, key, outputConfigurations;
        builder = new SpriteSheetBuilder(options);
        outputConfigurations = options.output;
        delete options.output;
        if (outputConfigurations && Object.keys(outputConfigurations).length > 0) {
            for (key in outputConfigurations) {
                config = outputConfigurations[key];
                builder.addConfiguration(key, config);
            }
        }
        return builder;
    };

    return SpriteSheetBuilder;

})();

SpriteSheetConfiguration = (function() {
    function SpriteSheetConfiguration(files, options) {
        this.createSprite = __bind(this.createSprite, this);
        this.generateCSS = __bind(this.generateCSS, this);
        this.identify = __bind(this.identify, this);
        this.layoutImages = __bind(this.layoutImages, this);
        this.build = __bind(this.build, this);

//        if (!options.selector) {
//            throw "no selector specified";
//        }

        this.images = [];
        this.filter = options.filter;
        this.outputDirectory = path.resolve(options.outputDirectory);
        this.files = this.filter ? files.filter(this.filter) : files;
        this.downsampling = options.downsampling;
        this.pixelRatio = options.pixelRatio || 1;
        this.name = options.name || "default";
        this.layoutType = options.layoutType || 'default';
        this.spIdentifier = options.spIdentifier || getFileNameWithoutExtension(options.outputCss);
        this.justResize = options.justResize || true;

        if (options.outputStyleDirectoryPath) {
            this.outputStyleDirectoryPath = options.outputStyleDirectoryPath;
        }

        if (options.outputImage) {
            this.outputImageFilePath = [this.outputDirectory, options.outputImage].join(separator);
            this.outputImageDirectoryPath = path.dirname(this.outputImageFilePath);
            this.httpImagePath = options.httpImagePath || path.relative(this.outputStyleDirectoryPath, this.outputImageFilePath);
        }

        if (options.outputStyleFilePath) {
            this.outputStyleFilePath = options.outputStyleFilePath;
        }

        this.style = new Style(options);
    }

    SpriteSheetConfiguration.prototype.build = function(callback) {
        var _this = this;

        if (!this.outputImageFilePath) {
            throw "No output image file specified";
        }

        console.log("--------------------------------------------------------------");
        console.log("Building '" + this.name + "' at pixel ratio " + this.pixelRatio);
        console.log("--------------------------------------------------------------");

        this.derived = (!this.filter && SpriteSheetConfiguration.baseConfiguration.name !== this.name) || this.files.length === 0;
        this.baseRatio = this.pixelRatio / SpriteSheetConfiguration.baseConfiguration.pixelRatio;
        return this.layoutImages(function() {
            if (_this.images.length === 0) {
                throw "No image files specified";
            }
            console.log(_this.summary());
            _this.generateCSS();
            return async.series([ensureDirectory(_this.outputImageDirectoryPath), _this.createSprite], callback);
        });
    };

    SpriteSheetConfiguration.prototype.layoutImages = function(callback) {
        var _this = this;

        return async.forEachSeries(this.files, this.identify, function() {
            var layout;
            if (_this.layoutType === 'vertical') {
                layout = new Layout_vertical();
            } else if (_this.layoutType === 'horizontal') {
                layout = new Layout_horizontal();
            } else {
                layout = new Layout();
            }
            _this.layout = layout.layout(_this.images, _this.options);
            return callback();
        });
    };

    SpriteSheetConfiguration.prototype.identify = function(filepath, callback) {
        var _this = this;

        return ImageMagick.identify(filepath, function(image) {
            if (_this.derived) {
                // resize from original
                if (!_this.justResize) {
                    // not resize
                    image.width = image.width * _this.baseRatio;
                    image.height = image.height * _this.baseRatio;
                    if (Math.round(image.width) !== image.width || Math.round(image.height) !== image.height) {
                        image.width = Math.ceil(image.width);
                        image.height = Math.ceil(image.height);
                        console.log("  WARN: Dimensions for " + image.filename + " don't use multiples of the pixel ratio, so they've been rounded.");
                    }
                }
                image.baseRatio = _this.baseRatio;
            }
            _this.images.push(image);
            return callback(null, image);
        });
    };

    SpriteSheetConfiguration.prototype.generateCSS = function() {
        if (this.derived && this.justResize) {
            this.css = {};
        } else {
            this.css = this.style.generate({
                relativeImagePath: this.httpImagePath,
                images: this.images,
                pixelRatio: this.pixelRatio,
                width: this.layout.width,
                height: this.layout.height,
                spIdentifier: this.spIdentifier
            });
        }

    };

    SpriteSheetConfiguration.prototype.createSprite = function(callback) {
        var _this = this;

        if (this.justResize && this.derived) {
            // resize from base
            return ImageMagick.resizeImage({
                filepath: this.outputImageFilePath,
                srcpath: SpriteSheetConfiguration.baseConfiguration.outputImageFilePath,
                width: this.layout.width,
                height: this.layout.height,
                downsampling: this.downsampling,
                baseRatio: this.baseRatio
            }, function() {
                return SpriteSheetBuilder.pngcrush(_this.outputImageFilePath, callback);
            });
        } else {
            return ImageMagick.composite({
                filepath: this.outputImageFilePath,
                images: this.images,
                width: this.layout.width,
                height: this.layout.height,
                downsampling: this.downsampling
            }, function() {
                return SpriteSheetBuilder.pngcrush(_this.outputImageFilePath, callback);
            });
        }
    };

    SpriteSheetConfiguration.prototype.summary = function() {
        var i, output, _i, _len, _ref;

        output = "\n  Creating a sprite from following images:\n";
        _ref = this.images;

        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            i = _ref[_i];
            output += "    " + (this.reportPath(i.path)) + " (" + i.width + "x" + i.height;
            if (this.derived) {
                output += " - derived from " + SpriteSheetConfiguration.baseConfiguration.name;
            }
            output += ")\n";
        }

        output += "\n  Output files:     " + (this.reportPath(this.outputImageFilePath));
        output += "\n  Output size:      " + this.layout.width + "x" + this.layout.height + "      \n";
        return output;
    };

    SpriteSheetConfiguration.prototype.reportPath = function(path) {
        return path;
    };

    return SpriteSheetConfiguration;

})();

module.exports = SpriteSheetBuilder;
