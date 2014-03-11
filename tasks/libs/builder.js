var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    Layout = require('layout'),
    gmsmith = require('gmsmith'),
    CanvasSmith = require('./canvas.smith.js'),
    qfs = require('q-io/fs'),
    gm = require('gm'),
    mustache = require('mustache'),

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
var Builder = (function() {
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
    }

    Builder.prototype.makeSpriteConfig = function(type) {
        var that = this,
            config;

        if (that.options.output.hasOwnProperty(type) && that.options.output[type].hasOwnProperty('outputImage')) {
            config = {
                outputDirectory: that.outputDirectory,
                outputFilePath: that.options.output[type].outputImage,
                files: that.options.images,
                spIdentifier: that.options.spIdentifier || getFileNameWithoutExtension(that.options.outputCss),
                downsampling: that.options.downsampling,
                pixelRatio: that.options.output[type].pixelRatio || 1,
                justResize: that.options.justResize,
                layoutType: that.options.layoutType,
                padding: that.options.padding,
                httpImagePath: that.options.httpImagePath ||
                    path.relative(that.outputStyleDirectoryPath, that.options.output[type].outputImage)
            };
            if (!this.baseSpriteConfig || config.pixelRatio > this.baseSpriteConfig.pixelRatio) {
                this.baseSpriteConfig = config;
            }
            that.spriteConfigs[type] = config;
        }
    };

    Builder.prototype.build = function(callback) {
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
                return -1;
            } else if (a.pixelRatio < b.pixelRatio) {
                return 1;
            }
            return 0;
        });

        async.series([
            function(callback) {
                // スプライト画像作成
                async.forEachSeries(that.configs, that.compile.bind(that), callback);
            },
            that.writeStyleSheet.bind(that),
            Builder.summaryErrors
        ], callback);

    };

    Builder.prototype.compile = function(config, callback) {
        var that = this,
            layer = new Layout(config.layoutType),
            funcArray = [];

        if (config.baseRatio < 1) {
            // resize
            funcArray = [
                function(callback) {
                    that.resizeLayoutData(config, that.configs);
                    callback();
                },
                function resizeSpriteImage(callback){
                    var baseSpritePath = path.resolve(that.baseSpriteConfig.outputDirectory, that.baseSpriteConfig.outputFilePath),
                        targetSpritePath = path.resolve(config.outputDirectory, config.outputFilePath),
                        targetDirPath = path.dirname(targetSpritePath);

                    if (fs.statSync(baseSpritePath).isFile()) {
                        qfs.makeTree(targetDirPath).then(function() {
                            var _gm = gm.subClass({imageMagick: true});
                            _gm(baseSpritePath).resize(config.layoutData.width, config.layoutData.height)
                                .unsharp(2, 1.4, 0.5, 0)
                                .write(targetSpritePath, function() {
                                    console.log('spritesheet output path: ' + targetSpritePath);
                                    console.log('  - derived from ' + baseSpritePath);
                                    callback();
                                });
                        });

                    } else {
                        Builder.errors(colorRed + 'Fatal: base sprite' + ' "' + baseSpritePath + '" doesn\'t exist.' + colorReset);
                        callback();
                    }
                }
            ];
        } else {
            // composite
            funcArray = [
                function layoutImages(callback) {
                    gmsmith.createImages(config.files, function(err, images) {

                        images.forEach(function(img) {
                            var width = img.width * config.baseRatio,
                                height = img.height * config.baseRatio,
                                meta = {
                                    img: img,
                                    name: path.basename(img.file).split('.')[0],
                                    actualWidth: width,
                                    actualHeight: height
                                };

                            layer.addItem({
                                width: width + config.padding,
                                height: height + config.padding,
                                meta: meta
                            });
                        });

                        config.layoutData = layer.export();

                        callback();
                    });
                },
                function createCanvas(callback) {
                    var width = Math.max(config.layoutData.width || 0, 0),
                        height = Math.max(config.layoutData.height || 0, 0),
                        itemsExist = config.layoutData.items.length;

                    if (itemsExist) {
                        width -= config.padding;
                        height -= config.padding;
                    }

                    config.layoutData.width = width;
                    config.layoutData.height = height;

                    if (itemsExist) {
                        gmsmith.createCanvas(width, height, function(err, canvas) {
                            config.canvas = canvas;
                            callback();
                        });
                    } else {
                        config.canvas = null;
                        callback();
                    }
                },
                function buildSprite(callback) {
                    // generate spritesheet
                    var items = config.layoutData.items,
                        canvas = config.canvas;

                    if (!canvas) {
                        callback();
                    }

                    var canvasSmith = new CanvasSmith(canvas),
                        ext = path.extname(config.outputFilePath).split('.');

                    canvasSmith.addImages(items);

                    canvasSmith.export({
                        format: ext[ext.length - 1],
                        quality: 90
                    }, function(err, imgStr) {
                        config.renderedImage = imgStr;
                        callback();
                    });
                },
                function writeSpriteSheet(callback) {
                    var spritePath = path.resolve(config.outputDirectory, config.outputFilePath),
                        spriteDir = path.dirname(spritePath);

                    qfs.makeTree(spriteDir).then(function() {
                        fs.writeFileSync(spritePath, config.renderedImage, 'binary');
                        console.log('spritesheet output path: ' + spritePath);
                        callback();
                    });
                }
            ];
        }

        async.waterfall(funcArray, callback);
    };

    Builder.prototype.writeStyleSheet = function(callback) {
        var that = this,
            cssData = {},
            template = fs.readFileSync(that.options.templateUrl, 'utf8'),
            outputDir = that.outputStyleDirectoryPath,
            outputPath = that.outputStyleFilePath,
            result;

        that.configs.forEach(function(config) {
            cssData[(config.baseRatio === 1) ? 'retina' : 'legacy'] = that.generateCSSData(config);
        });

        result = mustache.render(template, cssData);

        qfs.makeTree(outputDir).then(function() {
            fs.writeFileSync(outputPath, result);
            console.log('stylesheet output path: ' + outputPath);
            callback();
        });
    };

    Builder.prototype.generateCSSData = function(config) {
        var css = {
            imagePath: config.httpImagePath,
            imageWidth: config.layoutData.width,
            imageHeight: config.layoutData.height,
            pixelRatio: config.pixelRatio,
            spIdentifier: config.spIdentifier,
            styles: []
        };

        config.layoutData.items.forEach(function(item) {
            css.styles.push({
                imagePath: config.httpImagePath,
                imageWidth: config.layoutData.width,
                imageHeight: config.layoutData.height,
                pixelRatio: config.pixelRatio,
                spIdentifier: config.spIdentifier,
                name: item.meta.name,
                x: (item.x * -1),
                y: (item.y * -1),
                width: item.meta.actualWidth,
                height: item.meta.actualHeight
            });
        });

        return css;
    };

    Builder.prototype.resizeLayoutData = function(currentConfig, configs) {
        var that = this,
            baseLayout,
            baseRatio = currentConfig.baseRatio,
            itemHeight, itemWidth;

        configs.forEach(function(config) {
            if (config.baseRatio === 1) {
                baseLayout = config.layoutData;
            }
        });

        currentConfig.layoutData = {
            height: baseLayout.height * baseRatio,
            width: baseLayout.width * baseRatio,
            items: []
        };

        baseLayout.items.forEach(function(item) {
            itemHeight = Math.ceil(item.meta.actualHeight * baseRatio);
            itemWidth = Math.ceil(item.meta.actualWidth * baseRatio);

            if (baseRatio === 1 && (itemHeight % 2 !== 0 || itemWidth % 2 !== 0)) {
                Builder.errors.push(colorRed + 'WARN: Dimensions for ' + item.meta.img.file +
                    ' is not even. So they\'ve been rounded.' + colorReset);
            }

            currentConfig.layoutData.items.push({
                height: Math.ceil(item.height * baseRatio),
                width: Math.ceil(item.width * baseRatio),
                x: Math.ceil(item.x * baseRatio),
                y: Math.ceil(item.y * baseRatio),
                meta: {
                    name: item.meta.name,
                    img: item.meta.img,
                    actualHeight: itemHeight,
                    actualWidth: itemWidth
                }
            });
        });
    };

    Builder.errors = [];

    Builder.summaryErrors = function(callback) {

        var that = Builder;

        console.log('----------');
        console.log('following error has been occurred while processing:');

        if (that.errors.length > 0) {
            [].forEach.call(that.errors, function(error) {
                console.log(error);
            });
        } else {
            console.log(colorGreen + 'no errors have been captured!' + colorReset);
        }

        callback();
    };


    return Builder;
})();


module.exports = Builder;