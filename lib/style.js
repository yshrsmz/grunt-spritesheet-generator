var path = require('path'),

    Style = (function() {
        function Style(options) {
            this.selector = options.selector;
            this.pixelRatio = options.pixelRatio || 1;

            if (options.resolveImageSelector) {
                this.resolveImageSelector = options.resolveImageSelector;
            }
        }

        Style.prototype.resolveImageSelector = function(name) {
            return name;
        };

        Style.prototype.generate = function(options) {

            var relativeImagePath = options.relativeImagePath,
                images = options.images,
                pixelRatio = options.pixelRatio,
                width = options.width,
                height = options.height,
                css;

            css = {
                imagePath: relativeImagePath,
                imageWidth: (width / pixelRatio),
                imageHeight: (height / pixelRatio),
                pixelRatio: pixelRatio,
                styles: []
            };

            [].forEach.call(images, function(image) {
                css.styles.push({
                    imagePath: relativeImagePath,
                    imageWidth: (width / pixelRatio),
                    imageHeight: (height / pixelRatio),
                    pixelRatio: (pixelRatio || 1),
                    name: image.name,
                    width: image.cssw,
                    height: image.cssh,
                    x: (-image.cssx / pixelRatio),
                    y: (-image.cssy / pixelRatio)
                });
            });
            return css;
        };

        return Style;

    })();

module.exports = Style;