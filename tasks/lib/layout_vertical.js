var Layout = require('./layout'),
    inherit = function(Child, Parent) {
        var F = function() {};
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.prototype.constructor = Child;
        Child.uber = Parent.prototype; // ←未使用の模様
    };


var Layout_vertical = (function() {
    function Layout_vertical() {};

    inherit(Layout_vertical, Layout);

    Layout_vertical.prototype.layout = function(images, options) {
        var hmargin, hpadding, i, lp, root, vmargin, vpadding, _i, _j, _len, _len1,
            _this = this;

        if (!options) {
            options = {};
        }

        if (!images || !images.length) {
            return {
                width: 0,
                height: 0
            };
        }
        hpadding = options.hpadding || 0;
        vpadding = options.vpadding || 0;
        hmargin = options.hmargin || 0;
        vmargin = options.vmargin || 0;
        for (_i = 0, _len = images.length; _i < _len; _i++) {
            i = images[_i];
            i.w = i.width + (2 * hpadding) + (2 * hmargin);
            i.h = i.height + (2 * vpadding) + (2 * vmargin);
        }

        root = {
            x: 0,
            y: 0,
            w: images[0].w,
            h: images[0].h
        };

        lp = function(i) {
            var node;
            node = _this.findNode(root, i.w, i.h);
            if (node) {
                _this.placeImage(i, node, hpadding, vpadding, hmargin, vmargin);
                _this.splitNode(node, i.w, i.h);
            } else {
                root = _this.grow(root, i.w, i.h);
                lp(i);
            }
        };
        for (_j = 0, _len1 = images.length; _j < _len1; _j++) {
            i = images[_j];
            lp(i);
        }
        return {
            width: root.w,
            height: root.h
        };
    };

    Layout_vertical.prototype.grow = function(root, w, h) {
        return this.growDown(root, w, h);
    };

    return Layout_vertical;
})();

module.exports = Layout_vertical;