define(['./vendorPrefix'], function (vendorPrefix) {

    var Effect = function Effect(params) {

        if (params) _.extend(this, params);

        this.vendorPrefix = vendorPrefix;

        if (this.vendorPrefix == 'moz' || this.vendorPrefix == '') this.transitionEndEvent = 'transitionend';
        else if (this.vendorPrefix == 'ms') this.transitionEndEvent = 'MSTransitionEnd';
        else this.transitionEndEvent = this.vendorPrefix + 'TransitionEnd';

    };

    // Shared empty constructor function to aid in prototype-chain creation.
    var ctor = function () {
    };

    Effect.prototype = {
        removePositionCSS: function(view) {
            var $view = view.$el;
            $view.css('left', 0);
            if (view.addedPositionCSS) {
                $view.css('position', '');
                $view.css('width', '');
                $view.removeClass('stackPositioned');
                delete view.addedPositionCSS;
            }
        },
        addPositionCSS: function(view) {
            var $view = view.$el;
            $view.css({position: view.stackPosition || 'inherit', width: '100%'});
            $view.addClass('stackPositioned');
            view.addedPositionCSS = true;
        }
    };

    Effect.extend = function (protoProps, staticProps) {
        var child = function () {
            Effect.apply(this, arguments);
        };

        // Inherit class (static) properties from parent.
        _.extend(child, Effect);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        ctor.prototype = Effect.prototype;
        child.prototype = new ctor();

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) _.extend(child.prototype, protoProps);

        // Add static properties to the constructor function, if supplied.
        if (staticProps) _.extend(child, staticProps);

        // Correctly set child's `prototype.constructor`.
        child.prototype.constructor = child;

        // Set a convenience property in case the parent's prototype is needed later.
        child.__super__ = Effect.prototype;

        return child;
    };

    return Effect;
});