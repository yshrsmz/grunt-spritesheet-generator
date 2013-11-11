var Layout_vertical = require('./layout_vertical'),
    inherit = function(Child, Parent) {
        var F = function() {};
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.prototype.constructor = Child;
        Child.uber = Parent.prototype; // ←未使用の模様
    };

/**
 * align horizontally
 */
var Layout_horizontal = (function() {
    function Layout_horizontal() {};

    inherit(Layout_horizontal, Layout_vertical);

    Layout_horizontal.prototype.grow = function(root, w, h) {
        return this.growRight(root, w, h);
    };

    return Layout_horizontal;
})();


module.exports = Layout_horizontal;