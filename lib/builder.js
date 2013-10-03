var fs = require('fs'),
    path = require('path'),
    qfs = require('q-fs'),
    exec = require('child_process').exec,
    async = require('async'),
    _ = require('underscore'),
    ImageMagick = require('./imagemagick'),
    Layout = require('./layout'),
    Style = require('./style'),
    mustache = require('mustache'),

    // get separator
    separator = path.sep || '/',

    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); };},

    ensureDirectory = function(directory) {
        return function(callback) {
            return qfs.isDirectory(directory).then(function(isDir) {
                if (isDir) {
                    // if directory exists, then callback
                    return callback();
                } else {
                    // if not, create directories, then callback
                    return qfs.makeTree(directory).then(callback);
                }
            });
        };
    },

    SpriteSheetBuilder = (function() {

        function SpriteSheetBuilder(options) {
            this.options = options;
            this.writeStyleSheet = __bind(this.writeStyleSheet, this);
            this.buildConfig = __bind(this.buildConfig, this);
            this.files = options.files;
            this.outputConfigurations = {};
            this.outputDirectory = path.normalize(options.outputDirectory);
            if (options.outputCss) {
                this.outputStyleFilePath = [this.outputDirectory, options.outputCss].join(separator);
                this.outputStyleDirectoryPath = path.dirname(this.outputStylesheetPath);
            }
        };

        SpriteSheetBuilder.prototype.addConfiguration = function(name, options) {
            var config = _.extend(this.options, options, {
                    name: name,
                    outputStyleFilePath: this.outputStyleFilePath,
                    outputStyleDirectoryPath: this.outputStyleDirectoryPath
                }),
                ssc = new SpriteSheetConfiguration(options.images || this.files, config),
                baseConfig;

            this.outputConfigurations[name] = ssc;

            if (!baseConfig || config.pixelRatio > baseConfig.pixelRatio) {
                baseConfig = config;
            }
            return ssc;
        };

        SpriteSheetBuilder.prototype.build = function(done) {
            var that = this,
                baseConfig = null,
                config,
                key;

            if (!that.outputStyleFilePath) {
                throw 'no output style file specified';
            }

            if (Object.keys(this.outputConfigurations).length === 0) {
                that.addConfiguration('default', {
                    pixelRatio: 1
                });
            }

            that.configs = [];

            for (key in that.outputConfigurations) {
                config = this.outputConfigurations[key];
                if (!baseConfig || config.pixelRatio > baseConfig.pixelRatio) {
                    baseConfig = config;
                }
                that.configs.push(config);
            }

            SpriteSheetConfiguration.baseConfiguration = baseConfig;

            return async.series([
                function(callback) {
                    return async.forEachSeries(that.configs, that.buildConfig, callback);
                },
                ensureDirectory(that.outputStyleDirectoryPath),
                that.writeStyleSheet
            ], done);
        };

        SpriteSheetBuilder.prototype.buildConfig = function(config, callback) {
            return config.build(callback);
        };

        SpriteSheetBuilder.prototype.writeStyleSheet = function(callback) {
            var that = this,
                css = that.configs.map(function(config) {
                    return config.css;
                }),
                template = fs.readFileSync(this.options.templateUrl || __dirname + '/../tasks/template.mustache', 'utf8'),
                templateData = {},
                result;

            [].forEach.call(that.configs, function(config) {
                if (config.name.toLowerCase() === 'legacy') {
                    templateData.std = config.css;
                } else if (config.name.toLowerCase() === 'retina') {
                    templateData.dbl = config.css;
                }
            });

            result = mustache.render(template, templateData);

            return fs.writeFile(that.outputStyleFilePath, result, function(err) {
                if (err) {
                    throw err;
                } else {
                    console.log('CSS file written to', that.outputStyleFilePath, '\n');
                    return callback();
                }
            });
        };

        SpriteSheetBuilder.supportsPngcrush = function(callback) {
            var that = this;

            return exec('which pngcrush', function(err, stdout, stderr) {
                return callback(stdout && !err && !stderr);
            });
        };

        SpriteSheetBuilder.pngcrush = function(image, callback) {
            return SpriteSheetBuilder.supportsPngcrush(function(supported) {
                var that = this,
                    crushed;

                if (supported) {
                    crushed = '' + image + '.crushed';
                    console.log('\n pngcrushing, this may take a few moments...\n');

                    return exec('pngcrush -reduce ' + image + ' ' + crushed + ' && mv ' + crushed + ' ' + image, function(err, stdout, stderr) {
                        return callback();
                    });
                } else {
                    return callback();
                }
            });
        };

        SpriteSheetBuilder.fromGruntTask = function(options) {
            var builder = new SpriteSheetBuilder(options),
                outputConfigurations = options.output,
                key, config;

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
    })(),


    SpriteSheetConfiguration = (function() {
        function SpriteSheetConfiguration(files, options) {
            this.createSprite = __bind(this.createSprite, this);
            this.generateCSS = __bind(this.generateCSS, this);
            this.identify = __bind(this.identify, this);
            this.layoutImages = __bind(this.layoutImages, this);
            this.build = __bind(this.build, this);
            if (!options.selector) {
                throw "no selector specified";
            }
            this.images = [];
            this.filter = options.filter;
            this.outputDirectory = path.normalize(options.outputDirectory);
            this.files = this.filter ? files.filter(this.filter) : files;
            this.downsampling = options.downsampling;
            this.pixelRatio = options.pixelRatio || 1;
            this.name = options.name || "default";
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
        };

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
                layout = new Layout();
                _this.layout = layout.layout(_this.images, _this.options);
                return callback();
            });
        };

        SpriteSheetConfiguration.prototype.identify = function(filepath, callback) {
            var _this = this;
            return ImageMagick.identify(filepath, function(image) {
                if (_this.derived) {
                    image.width = image.width * _this.baseRatio;
                    image.height = image.height * _this.baseRatio;
                    if (Math.round(image.width) !== image.width || Math.round(image.height) !== image.height) {
                        image.width = Math.ceil(image.width);
                        image.height = Math.ceil(image.height);
                        console.log("  WARN: Dimensions for " + image.filename + " don't use multiples of the pixel ratio, so they've been rounded.");
                    }
                    image.baseRatio = _this.baseRatio;
                }
                _this.images.push(image);
                return callback(null, image);
            });
        };

        SpriteSheetConfiguration.prototype.generateCSS = function() {
            return this.css = this.style.generate({
                relativeImagePath: this.httpImagePath,
                images: this.images,
                pixelRatio: this.pixelRatio,
                width: this.layout.width,
                height: this.layout.height
            });
        };

        SpriteSheetConfiguration.prototype.createSprite = function(callback) {
            var _this = this;
            return ImageMagick.composite({
                filepath: this.outputImageFilePath,
                images: this.images,
                width: this.layout.width,
                height: this.layout.height,
                downsampling: this.downsampling
            }, function() {
                return SpriteSheetBuilder.pngcrush(_this.outputImageFilePath, callback);
            });
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