define(['./Effect'], function (Effect) {

    var FadeEffect = Effect.extend({

        name: 'FadeEffect',

        fromViewTransitionProps:{duration:0.4, easing:'linear', delay:0.1},

        toViewTransitionProps:{duration:0.4, easing:'linear', delay:0.1},

        play:function (fromView, toView, callback, context) {

            var that = this,
                $toView = toView && toView.$el,
                $fromView = fromView && fromView.$el,
                timeout,
                activeTransitions = 0,
                transitionProp = that.vendorPrefix == '' ? 'transition'
                    : ['-' + that.vendorPrefix.toLowerCase(), '-', 'transition'].join('');

            var transitionEndHandler = function (event) {
                if (activeTransitions >= 0) {
                    activeTransitions--;

                    $(event.target).css(transitionProp, '');

                    if (activeTransitions == 0 && callback) {
                        if (timeout) clearTimeout(timeout);
                        if ($fromView) $fromView.css('opacity', 1);
                        callback.call(context);
                    }
                }
            };

            if ($fromView) {
                activeTransitions++;

                // Registering transition end handler
                $fromView.one(that.transitionEndEvent, transitionEndHandler);

                // Setting initial opacity
                $fromView.css('opacity', 1);
                if ($fromView.css('display') === 'none') $fromView.show();

                // Setting transition css props
                $fromView.css(transitionProp, ['opacity ', that.fromViewTransitionProps.duration, 's ',
                                               that.fromViewTransitionProps.easing, ' ',
                                               that.fromViewTransitionProps.delay, 's'].join(''));
            }

            if ($toView) {
                activeTransitions++;

                $toView.one(that.transitionEndEvent, transitionEndHandler);

                // Setting initial opacity
                $toView.css('opacity', 0.01);
                if ($toView.css('display') === 'none') $toView.show();

                // Setting transition css props
                $toView.css(transitionProp, ['opacity ', that.toViewTransitionProps.duration, 's ',
                                             that.toViewTransitionProps.easing, ' ',
                                             that.toViewTransitionProps.delay, 's'].join(''));

                // Showing the view
                $toView.css('visibility', 'visible');
            }

            // This is a hack to force DOM reflow before transition starts
            context.$el.css('width');

            // This is a fallback for situations when TransitionEnd event doesn't get triggered
            var transDuration = Math.max(that.fromViewTransitionProps.duration, that.toViewTransitionProps.duration) +
                Math.max(that.fromViewTransitionProps.delay, that.toViewTransitionProps.delay);

            timeout = setTimeout(function () {
                if (activeTransitions > 0) {
                    activeTransitions = -1;

                    that.log('warn', 'Warning ' + that.transitionEndEvent + ' didn\'t trigger in expected time!', that);

                    if ($toView) {
                        $toView.off(that.transitionEndEvent, transitionEndHandler);
                        $toView.css(transitionProp, '');
                        $toView.css('opacity', 1);
                    }

                    if ($fromView) {
                        $fromView.off(that.transitionEndEvent, transitionEndHandler);
                        $fromView.css(transitionProp, '');
                        $fromView.css('opacity', 0);
                    }

                    callback.call(context);
                }
            }, transDuration * 1.5 * 1000);

            if ($toView) $toView.css('opacity', 1);
            if ($fromView) $fromView.css('opacity', 0.01);
        }
    });

    return FadeEffect;
});