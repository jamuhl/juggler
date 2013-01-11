define(['./Effect'], function (Effect) {

    var SlideEffect = Effect.extend({

        name: 'SlideEffect',

        direction:'left',

        fromViewTransitionProps:{duration:0.4, easing:'ease-out', delay:0},

        toViewTransitionProps:{duration:0.4, easing:'ease-out', delay:0},

        play:function (fromView, toView, callback, context) {

            var timeout,
                that = this,
                $toView = toView && toView.$el,
                $fromView = fromView && fromView.$el,
                activeTransitions = 0,
                transformParams,
                transformProp = that.vendorPrefix == '' ? 'transform' :
                    ['-' + that.vendorPrefix, '-', 'transform'].join(''),
                transitionProp = that.vendorPrefix == '' ? 'transition' :
                    ['-' + that.vendorPrefix, '-', 'transition'].join('');

            var transitionEndHandler = function (event) {
                if (activeTransitions >= 0) {
                    activeTransitions--;

                    var $target = $(event.target);
                    $target.css(transformProp, '');
                    $target.css(transitionProp, '');

                    if ($toView && $toView[0] == event.target) {
                        that.removePositionCSS(toView);
                    }
                    if ($fromView && $fromView[0] == event.target) {
                        that.removePositionCSS(fromView);
                    }

                    if (activeTransitions == 0 && callback) {
                        if (timeout) clearTimeout(timeout);
                        callback.call(context);
                    }
                }
            };

            if ($fromView) {
                activeTransitions++;

                $fromView.one(that.transitionEndEvent, transitionEndHandler);

                $fromView.css('left', 0);
                $fromView.css(transitionProp, [transformProp, ' ',
                                               that.fromViewTransitionProps.duration, 's ',
                                               that.fromViewTransitionProps.easing, ' ',
                                               that.fromViewTransitionProps.delay, 's'].join(''));

                fromView.popCSS = fromView.popCSS || {};
                if (fromView.allowAutoStackPositioning && !fromView.popCSS.position && !fromView.popCSS.width) {
                    that.addPositionCSS(fromView);
                }
                $fromView.css(fromView.popCSS);
                context.$el.css('width'); // reflow
            }

            if ($toView) {
                activeTransitions++;

                $toView.one(that.transitionEndEvent, transitionEndHandler);
                $toView.css('left', that.direction == 'left' ? context.$el.width() : -context.$el.width());
                $toView.css(transitionProp, [transformProp, ' ',
                                             that.toViewTransitionProps.duration, 's ',
                                             that.toViewTransitionProps.easing, ' ',
                                             that.toViewTransitionProps.delay, 's'].join(''));

                
                toView.pushCSS = toView.pushCSS || {};
                if (toView.allowAutoStackPositioning && !toView.pushCSS.position && !toView.pushCSS.width) {
                    that.addPositionCSS(toView);
                }
                $toView.css(toView.pushCSS);
                context.$el.css('width'); // reflow

                // Showing the view
                $toView.css('visibility', 'visible');
            }

            if ($fromView || $toView) {
                // This is a hack to force DOM reflow before transition starts
                context.$el.css('width');

                transformParams = 'translate3d(' + (that.direction == 'left' ? -context.$el.width() : context.$el.width()) + 'px, 0, 0)';
            }

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
                        $toView.css(transformProp, '');
                        $toView.css('left', 0);
                        that.removePositionCSS(toView);
                    }

                    if ($fromView) {
                        $fromView.off(that.transitionEndEvent, transitionEndHandler);
                        $fromView.css(transitionProp, '');
                        $fromView.css(transformProp, '');
                        that.removePositionCSS(fromView);
                    }

                    callback.call(context);
                }
            }, transDuration * 1.5 * 1000);

            var $views;
            if ($fromView && $toView) $views = $fromView.add($toView);
            else if ($toView) $views = $toView;
            else if ($fromView) $views = $fromView;

            if ($views) $views.css(transformProp, transformParams);
        }
    });

    return SlideEffect;
});